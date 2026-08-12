import { createStudyId, normalizeStudyId, normalizeWave, isValidStudyId, deriveTaskOrder } from "../csv-utils.js";

const experimentUrl = new URL("../", window.location.href).href;
const body = document.querySelector("#roster-body");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#manager-message");
let roster = [];
let hasUnexportedChanges = false;

function markChanged() {
  hasUnexportedChanges = true;
  message.textContent = "Roster changed. Export the roster CSV before closing this page.";
}

function invitationLink(row) {
  const url = new URL(experimentUrl);
  url.searchParams.set("pid", normalizeStudyId(row.study_id));
  url.searchParams.set("wave", normalizeWave(row.wave));
  return url.href;
}

function render() {
  body.innerHTML = roster.map((row, index) => {
    const link = invitationLink(row);
    return `<tr data-index="${index}">
      <td><input data-field="contact_label" value="${escapeHtml(row.contact_label)}" placeholder="Name / WeChat / email"></td>
      <td><strong>${escapeHtml(row.study_id)}</strong></td>
      <td>${deriveTaskOrder(row.study_id) === "BART_LEXICAL" ? "BART first" : "Lexical first"}</td>
      <td><select data-field="wave">${["T1", "T2", "T3"].map((wave) => `<option ${row.wave === wave ? "selected" : ""}>${wave}</option>`).join("")}</select></td>
      <td class="link-cell" title="${escapeHtml(link)}">${escapeHtml(link)}</td>
      <td><div class="row-actions"><button class="mini-button" data-action="copy">Copy link</button><button class="mini-button" data-action="remove">Remove</button></div></td>
    </tr>`;
  }).join("");
  emptyState.hidden = roster.length > 0;
}

document.querySelector("#new-participant").addEventListener("click", () => {
  const counts = roster.reduce((output, row) => {
    output[deriveTaskOrder(row.study_id)] += 1;
    return output;
  }, { BART_LEXICAL: 0, LEXICAL_BART: 0 });
  const targetOrder = counts.BART_LEXICAL <= counts.LEXICAL_BART ? "BART_LEXICAL" : "LEXICAL_BART";
  let studyId = createStudyId();
  while (deriveTaskOrder(studyId) !== targetOrder || roster.some((row) => row.study_id === studyId)) studyId = createStudyId();
  roster.push({ contact_label: "", study_id: studyId, wave: "T1", created_at_iso: new Date().toISOString() });
  markChanged();
  render();
  body.querySelector("tr:last-child input")?.focus();
});

body.addEventListener("input", (event) => {
  const row = event.target.closest("tr");
  const field = event.target.dataset.field;
  if (!row || !field) return;
  roster[Number(row.dataset.index)][field] = event.target.value;
  markChanged();
  if (field === "wave") render();
});

body.addEventListener("change", (event) => {
  const row = event.target.closest("tr");
  const field = event.target.dataset.field;
  if (!row || !field) return;
  roster[Number(row.dataset.index)][field] = event.target.value;
  markChanged();
  render();
});

body.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const index = Number(button.closest("tr").dataset.index);
  if (button.dataset.action === "remove") {
    roster.splice(index, 1);
    markChanged();
    render();
    return;
  }
  if (button.dataset.action === "copy") {
    await navigator.clipboard.writeText(invitationLink(roster[index]));
    message.textContent = `Copied ${roster[index].wave} link for ${roster[index].study_id}.`;
  }
});

document.querySelector("#export-roster").addEventListener("click", () => {
  const columns = ["contact_label", "study_id", "task_order", "wave", "created_at_iso", "invitation_link"];
  const lines = [columns.join(",")];
  roster.forEach((row) => lines.push([
    row.contact_label, row.study_id, deriveTaskOrder(row.study_id), row.wave, row.created_at_iso, invitationLink(row)
  ].map(csvCell).join(",")));
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `LONGITUDINAL_ROSTER_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  hasUnexportedChanges = false;
  message.textContent = "Roster exported. Store it in a secure, access-controlled location.";
});

document.querySelector("#import-roster").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const rows = parseCsv(await file.text());
  const valid = rows.filter((row) => isValidStudyId(row.study_id)).map((row) => ({
    contact_label: row.contact_label || "",
    study_id: normalizeStudyId(row.study_id),
    wave: normalizeWave(row.wave),
    created_at_iso: row.created_at_iso || new Date().toISOString()
  }));
  roster = valid;
  hasUnexportedChanges = false;
  render();
  message.textContent = `Imported ${valid.length} participant(s).`;
  event.target.value = "";
});

document.querySelector("#clear-roster").addEventListener("click", () => {
  if (!window.confirm("Clear the roster currently open on this page? Export a backup first.")) return;
  roster = [];
  hasUnexportedChanges = false;
  render();
  message.textContent = "Local roster cleared.";
});

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted && char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers = [], ...records] = rows;
  return records.filter((record) => record.some(Boolean)).map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), record[index] || ""]))
  );
}

function csvCell(value) {
  const text = String(value || "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

render();

window.addEventListener("beforeunload", (event) => {
  if (!hasUnexportedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

// =====================================================================
//  Google Sheet backend via Apps Script Web App URL (full CRUD).
// =====================================================================
const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

if (!SCRIPT_URL) {
  console.warn('VITE_APPSCRIPT_URL is not set. Copy .env.example to .env, fill it in, then restart the dev server.');
}

// POST helper. No custom headers -> avoids CORS preflight against Apps Script.
const post = async (payload) => {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, ...payload }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data;
};

// Read a whole sheet as a 2D array (row 0 = headers).
export const fetchSheet = async (sheetName) => {
  const url = `${SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}&spreadsheetId=${SPREADSHEET_ID}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.success) return data.data;
  throw new Error(data.error || 'Failed to fetch sheet data');
};

// Insert a record (object keyed by column header). Apps Script fills
// Timestamp and, if autoIdColumn given, auto-generates the next ID.
export const insertRow = (sheetName, record, autoIdColumn = null, idPrefix = '') =>
  post({ action: 'insert', sheetName, record, autoIdColumn, idPrefix });

// Update the row whose matchColumn equals matchValue.
export const updateRow = (sheetName, matchColumn, matchValue, record) =>
  post({ action: 'update', sheetName, matchColumn, matchValue, record });

// Delete the row whose matchColumn equals matchValue.
export const deleteRow = (sheetName, matchColumn, matchValue) =>
  post({ action: 'delete', sheetName, matchColumn, matchValue });

// Upload a file to Google Drive (via Apps Script). fileData = base64 / dataURL.
// Returns { success, url, openUrl, fileId } — store `url` in the sheet cell.
export const uploadFile = (fileName, mimeType, fileData, folder) =>
  post({ action: 'upload', fileName, mimeType, fileData, folder });

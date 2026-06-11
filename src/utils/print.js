// =====================================================================
//  Print helpers — open a clean print window and call print().
//  Used for fee receipts, student ID cards, and table/list printing.
// =====================================================================

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
  .doc-head { text-align:center; border-bottom:3px solid #0284c7; padding-bottom:12px; margin-bottom:20px; }
  .doc-head h1 { margin:0; color:#0284c7; font-size:24px; letter-spacing:.5px; }
  .doc-head p { margin:2px 0 0; color:#64748b; font-size:12px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { border:1px solid #cbd5e1; padding:8px 10px; text-align:left; }
  th { background:#e0f2fe; color:#0369a1; }
  .muted { color:#64748b; }
  @media print { .no-print { display:none; } body { padding:0; } }
`;

const openPrint = (title, bodyHtml, extraCss = '') => {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) {
    alert('Please allow pop-ups to print.');
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>${BASE_CSS}${extraCss}</style></head><body>${bodyHtml}
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
    </body></html>`);
  w.document.close();
};

const docHead = (appName, subtitle) =>
  `<div class="doc-head"><h1>${esc(appName)}</h1><p>${esc(subtitle)}</p></div>`;

// ---- Fee receipt -----------------------------------------------------
export const printReceipt = (appName, row) => {
  const rows = [
    ['Receipt No', row['Receipt No']],
    ['Date', row['Paid On'] || new Date().toLocaleDateString('en-GB')],
    ['Admission No', row['Admission No']],
    ['Student Name', row['Student Name']],
    ['Class / Section', `${row['Class'] || ''}${row['Section'] ? ' - ' + row['Section'] : ''}`],
    ['Session', row['Session']],
    ['Month', row['Month']],
    ['Status', row['Status']],
  ]
    .map(([k, v]) => `<tr><th style="width:40%">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');

  const body = `
    ${docHead(appName, 'Fee Receipt')}
    <table>${rows}</table>
    <div style="margin-top:18px; text-align:right; font-size:20px; font-weight:bold;">
      Amount: Rs. ${esc(row['Amount'] || 0)}
      <span style="font-size:12px; font-weight:600; padding:3px 10px; border-radius:999px; margin-left:8px;
        background:${row['Status'] === 'Paid' ? '#dcfce7' : '#fee2e2'};
        color:${row['Status'] === 'Paid' ? '#15803d' : '#b91c1c'};">${esc(row['Status'] || '')}</span>
    </div>
    <div style="margin-top:60px; display:flex; justify-content:space-between; font-size:12px; color:#64748b;">
      <span>______________________<br>Parent Signature</span>
      <span style="text-align:right">______________________<br>Authorised Signatory</span>
    </div>
    <p class="muted" style="text-align:center; margin-top:24px; font-size:11px;">This is a computer generated receipt.</p>`;
  openPrint(`Receipt ${row['Receipt No'] || ''}`, body);
};

// ---- Student ID card -------------------------------------------------
export const printIdCard = (appName, row) => {
  const photo = String(row['Student Photo'] || '');
  const name = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
  const photoHtml = /^https?:\/\//i.test(photo)
    ? `<img src="${esc(photo)}" alt="photo" style="width:90px;height:110px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;">`
    : `<div style="width:90px;height:110px;border-radius:6px;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">Photo</div>`;

  const field = (k, v) => `<div style="margin:3px 0;"><b style="color:#0369a1;">${esc(k)}:</b> ${esc(v || '—')}</div>`;
  const body = `
    <div style="width:340px;margin:0 auto;border:2px solid #0284c7;border-radius:12px;overflow:hidden;">
      <div style="background:#0284c7;color:#fff;text-align:center;padding:10px;">
        <div style="font-size:18px;font-weight:bold;">${esc(appName)}</div>
        <div style="font-size:11px;opacity:.9;">Student Identity Card</div>
      </div>
      <div style="display:flex;gap:12px;padding:14px;">
        ${photoHtml}
        <div style="font-size:12px;line-height:1.4;">
          <div style="font-size:15px;font-weight:bold;margin-bottom:4px;">${esc(name)}</div>
          ${field('Adm No', row['Admission No'])}
          ${field('Class', `${row['Class'] || ''}${row['Section'] ? ' - ' + row['Section'] : ''}`)}
          ${field('Father', row['Father Name'])}
          ${field('Mobile', row['Father Mobile'])}
        </div>
      </div>
      <div style="background:#e0f2fe;color:#0369a1;font-size:10px;text-align:center;padding:6px;">${esc(row['Address'] || '')}</div>
    </div>`;
  openPrint(`ID Card ${row['Admission No'] || ''}`, body);
};

// ---- Generic table / list print -------------------------------------
export const printTable = (appName, title, headers, rows) => {
  const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${headers.map((_, i) => `<td>${esc(r[i])}</td>`).join('')}</tr>`)
    .join('');
  const body = `
    ${docHead(appName, `${title} — ${rows.length} record(s)`)}
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  openPrint(title, body, 'body{padding:16px;} @page{size:landscape;}');
};

import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Upload, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDataStore } from '../store/dataStore';
import { uploadFile } from '../utils/api';

const isImageUrl = (u) => /^https?:\/\//i.test(String(u || ''));

// Generic add/edit modal driven by a module's field config.
// mode: 'add' | 'edit'. initial: object keyed by field key (for edit).
const RecordModal = ({ mod, mode, initial, onClose, onSubmit }) => {
  const { getSheet, fetchData, sheets } = useDataStore();

  const buildInitial = () =>
    mod.fields.reduce((acc, f) => ({ ...acc, [f.key]: initial?.[f.key] ?? '' }), {});

  const [form, setForm] = useState(buildInitial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({}); // { fieldKey: true }

  // Read a chosen file, upload to Drive via Apps Script, store the URL.
  const handleFile = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading((p) => ({ ...p, [field.key]: true }));
      try {
        const res = await uploadFile(file.name, file.type, reader.result, field.driveFolder);
        if (!res?.url) throw new Error('No URL returned');
        setForm((p) => ({ ...p, [field.key]: res.url }));
        toast.success('Uploaded to Drive');
      } catch (err) {
        console.error(err);
        toast.error('Upload failed. Re-deploy Apps Script with Drive access.');
      } finally {
        setUploading((p) => ({ ...p, [field.key]: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Load source sheets for any "lookup" fields (e.g. the student picker).
  const lookupFields = mod.fields.filter((f) => f.type === 'lookup');
  useEffect(() => {
    lookupFields.forEach((f) => fetchData(f.lookupSheet));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // lookup field key -> [{ value, label, row }]
  const lookupOptions = useMemo(() => {
    const out = {};
    lookupFields.forEach((f) => {
      const { headers, rows } = getSheet(f.lookupSheet);
      out[f.key] = rows
        .map((r) => {
          const row = headers.reduce((a, h, i) => ((a[h] = r[i]), a), {});
          const value = String(row[f.lookupValueField] ?? '');
          const label = (f.lookupLabelFields || [f.lookupValueField])
            .map((k) => row[k])
            .filter((x) => x !== '' && x != null)
            .join(' — ');
          return { value, label, row };
        })
        .filter((o) => o.value);
    });
    return out;
  }, [sheets, mod]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // Selecting a lookup value also auto-fills its mapped target fields.
  const onLookupChange = (field, value) => {
    const opt = (lookupOptions[field.key] || []).find((o) => o.value === value);
    setForm((p) => {
      const next = { ...p, [field.key]: value };
      if (opt && field.autofill) {
        Object.entries(field.autofill).forEach(([target, src]) => {
          next[target] = Array.isArray(src)
            ? src.map((k) => opt.row[k]).filter(Boolean).join(' ')
            : (opt.row[src] ?? '');
        });
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const f of mod.fields) {
      if (f.required && !String(form[f.key] || '').trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Save failed. Check Apps Script URL / network.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-sky-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'edit' ? 'Edit' : 'Add'} {mod.label.replace(/s$/, '')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mod.autoId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{mod.idColumn}</label>
                <input
                  disabled
                  value={mode === 'edit' ? initial?.[mod.idColumn] || '' : 'Auto-generated'}
                  className="block w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>
            )}

            {mod.fields.map((field) => (
              <div key={field.key} className={`space-y-1.5 ${field.full ? 'sm:col-span-2' : ''}`}>
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>

                {field.type === 'file' ? (
                  <div className="space-y-2">
                    {form[field.key] && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 border border-sky-200">
                        {isImageUrl(form[field.key]) && (field.accept || '').includes('image') ? (
                          <img src={form[field.key]} alt="preview" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <FileText size={20} className="text-sky-600" />
                        )}
                        <a href={form[field.key]} target="_blank" rel="noreferrer" className="text-sky-600 underline text-sm truncate flex-1">View uploaded file</a>
                        <button type="button" onClick={() => onChange(field.key, '')} className="p-1 rounded text-red-500 hover:bg-red-50" title="Remove">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                    <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed cursor-pointer text-sm transition-all ${uploading[field.key] ? 'border-sky-300 bg-sky-50 text-sky-500' : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-sky-400'}`}>
                      {uploading[field.key] ? (
                        <><div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div> Uploading...</>
                      ) : (
                        <><Upload size={16} /> {form[field.key] ? 'Replace file' : 'Choose file (photo / PDF)'}</>
                      )}
                      <input
                        type="file"
                        accept={field.accept || 'image/*,.pdf'}
                        className="hidden"
                        disabled={uploading[field.key]}
                        onChange={(e) => handleFile(field, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                ) : field.type === 'lookup' ? (
                  <select
                    value={form[field.key]}
                    onChange={(e) => onLookupChange(field, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {(lookupOptions[field.key] || []).length ? `Select ${field.label}` : `Loading ${field.lookupSheet}...`}
                    </option>
                    {(lookupOptions[field.key] || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : field.type === 'select' ? (
                  <select
                    value={form[field.key]}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select {field.label}</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[field.key]}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={form[field.key]}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordModal;

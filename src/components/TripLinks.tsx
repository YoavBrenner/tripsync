import React, { useState, useEffect } from 'react';
import type { TripLink, LinkCategory } from '../types';
import { subscribeLinks, addLink, deleteLink } from '../services/tripService';
import { Plus, Link2, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  tripId: string;
}

const CATEGORY_OPTIONS: { value: LinkCategory; label: string }[] = [
  { value: 'booking',   label: 'הזמנות' },
  { value: 'map',       label: 'מפות' },
  { value: 'attraction',label: 'אטרקציות' },
  { value: 'transport', label: 'תחבורה' },
  { value: 'document',  label: 'מסמכים' },
  { value: 'other',     label: 'אחר' },
];

const CATEGORY_COLOR: Record<LinkCategory, string> = {
  booking:    'bg-blue-100 text-blue-700',
  map:        'bg-green-100 text-green-700',
  attraction: 'bg-orange-100 text-orange-700',
  transport:  'bg-purple-100 text-purple-700',
  document:   'bg-yellow-100 text-yellow-700',
  other:      'bg-slate-100 text-slate-600',
};

const EMPTY_FORM = {
  title: '',
  url: '',
  category: 'other' as LinkCategory,
  notes: '',
};

const TripLinks: React.FC<Props> = ({ tripId }) => {
  const [links, setLinks] = useState<TripLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return subscribeLinks(tripId, setLinks);
  }, [tripId]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      await addLink(tripId, {
        title: form.title.trim(),
        url: form.url.trim(),
        category: form.category,
        notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteLink(tripId, id);
    setPendingDelete(null);
  };

  // Group by category — only show groups that have entries
  const grouped = CATEGORY_OPTIONS.map(cat => ({
    ...cat,
    items: links.filter(l => l.category === cat.value),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">קישורים ומסמכים</h2>
          <p className="text-slate-500 text-sm">{links.length} קישורים</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow"
        >
          <Plus className="w-4 h-4" /> הוסף קישור
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
          <span className="font-bold text-slate-700 block">קישור חדש</span>

          <div className="grid grid-cols-1 gap-3">
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="כותרת"
              value={form.title}
              onChange={e => f('title', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="כתובת URL (https://...)"
              value={form.url}
              onChange={e => f('url', e.target.value)}
              dir="ltr"
            />
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={form.category}
              onChange={e => f('category', e.target.value as LinkCategory)}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <textarea
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full resize-none"
              rows={2}
              placeholder="הערות (אופציונלי)"
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!form.title.trim() || !form.url.trim() || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all"
            >
              {saving ? 'שומר...' : 'הוסף קישור'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {links.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Link2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">אין קישורים עדיין</p>
          <p className="text-sm mt-1">הוסיפו קישורים להזמנות, מפות ואטרקציות</p>
        </div>
      )}

      {/* Grouped links */}
      <div className="space-y-5">
        {grouped.map(group => (
          <div key={group.value}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map(link => (
                <div key={link.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLOR[link.category]}`}>
                            {CATEGORY_OPTIONS.find(c => c.value === link.category)?.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-0.5">{link.title}</p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700 break-all leading-relaxed"
                          dir="ltr"
                        >
                          {link.url}
                        </a>
                        {link.notes && (
                          <p className="text-xs text-slate-400 mt-1 italic">{link.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="flex-shrink-0">
                      {pendingDelete === link.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">בטוח?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(link.id)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg"
                          >
                            כן
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg"
                          >
                            לא
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(link.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripLinks;

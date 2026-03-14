import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Trip, TripStatus } from '../types';
import { subscribeTrips, createTrip, deleteTrip } from '../services/tripService';
import { Plus, Plane, Calendar, Users, Trash2, ChevronLeft } from 'lucide-react';

const STATUS_LABEL: Record<TripStatus, { label: string; color: string }> = {
  planning:  { label: 'בתכנון',        color: 'bg-yellow-100 text-yellow-700' },
  partial:   { label: 'הוזמן חלקית',   color: 'bg-orange-100 text-orange-700' },
  booked:    { label: 'הוזמן מלא',     color: 'bg-green-100 text-green-700'  },
  completed: { label: 'הסתיים',        color: 'bg-slate-100 text-slate-500'  },
};

// Country name (Hebrew or common) → flag emoji
const COUNTRY_FLAG: Record<string, string> = {
  'ישראל': '🇮🇱', 'israel': '🇮🇱',
  'איטליה': '🇮🇹', 'italy': '🇮🇹', 'italia': '🇮🇹',
  'צרפת': '🇫🇷', 'france': '🇫🇷',
  'ספרד': '🇪🇸', 'spain': '🇪🇸', 'espana': '🇪🇸',
  'יוון': '🇬🇷', 'greece': '🇬🇷',
  'פורטוגל': '🇵🇹', 'portugal': '🇵🇹',
  'הולנד': '🇳🇱', 'netherlands': '🇳🇱', 'holland': '🇳🇱',
  'בלגיה': '🇧🇪', 'belgium': '🇧🇪',
  'שווייץ': '🇨🇭', 'switzerland': '🇨🇭',
  'אוסטריה': '🇦🇹', 'austria': '🇦🇹',
  'גרמניה': '🇩🇪', 'germany': '🇩🇪',
  'צ\'כיה': '🇨🇿', 'czech': '🇨🇿', 'prague': '🇨🇿',
  'פולין': '🇵🇱', 'poland': '🇵🇱',
  'הונגריה': '🇭🇺', 'hungary': '🇭🇺',
  'רומניה': '🇷🇴', 'romania': '🇷🇴',
  'קרואטיה': '🇭🇷', 'croatia': '🇭🇷',
  'סלובניה': '🇸🇮', 'slovenia': '🇸🇮',
  'טורקיה': '🇹🇷', 'turkey': '🇹🇷',
  'מצרים': '🇪🇬', 'egypt': '🇪🇬',
  'ירדן': '🇯🇴', 'jordan': '🇯🇴',
  'יפן': '🇯🇵', 'japan': '🇯🇵',
  'תאילנד': '🇹🇭', 'thailand': '🇹🇭',
  'בלי': '🇧🇱', 'bali': '🇮🇩', 'אינדונזיה': '🇮🇩',
  'וייטנאם': '🇻🇳', 'vietnam': '🇻🇳',
  'הודו': '🇮🇳', 'india': '🇮🇳',
  'ארה"ב': '🇺🇸', 'usa': '🇺🇸', 'אמריקה': '🇺🇸', 'america': '🇺🇸',
  'קנדה': '🇨🇦', 'canada': '🇨🇦',
  'מקסיקו': '🇲🇽', 'mexico': '🇲🇽',
  'ברזיל': '🇧🇷', 'brazil': '🇧🇷',
  'ארגנטינה': '🇦🇷', 'argentina': '🇦🇷',
  'אנגליה': '🇬🇧', 'england': '🇬🇧', 'uk': '🇬🇧', 'britain': '🇬🇧',
  'אירלנד': '🇮🇪', 'ireland': '🇮🇪',
  'סקוטלנד': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'נורבגיה': '🇳🇴', 'norway': '🇳🇴',
  'שבדיה': '🇸🇪', 'sweden': '🇸🇪',
  'דנמרק': '🇩🇰', 'denmark': '🇩🇰',
  'פינלנד': '🇫🇮', 'finland': '🇫🇮',
  'אוסטרליה': '🇦🇺', 'australia': '🇦🇺',
  'ניו זילנד': '🇳🇿', 'new zealand': '🇳🇿',
  'דובאי': '🇦🇪', 'dubai': '🇦🇪', 'אמירויות': '🇦🇪',
  'מרוקו': '🇲🇦', 'morocco': '🇲🇦',
  'דרום אפריקה': '🇿🇦', 'south africa': '🇿🇦',
  'קניה': '🇰🇪', 'kenya': '🇰🇪',
  'טנזניה': '🇹🇿', 'tanzania': '🇹🇿',
};

function getCountryFlag(countries: string): string {
  const first = countries.split(',')[0].trim().toLowerCase();
  return COUNTRY_FLAG[first] || COUNTRY_FLAG[countries.trim().toLowerCase()] || '✈️';
}

function autoName(countries: string, startDate: string): string {
  const country = countries.split(',')[0].trim();
  const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
  return country ? `${country} ${year}` : '';
}

function fmtDate(d: string) {
  if (!d) return '';
  return d.split('-').reverse().join('/');
}

interface Props {
  user: User;
  onSelectTrip: (trip: Trip) => void;
}

const EMPTY_FORM = {
  countries: '', cities: '', startDate: '', endDate: '',
  travelers: '2', travelerNames: '', status: 'planning' as TripStatus,
  notes: '', nameOverride: '',
};

const TripsList: React.FC<Props> = ({ user, onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return subscribeTrips(user.uid, setTrips);
  }, [user.uid]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Auto-computed values
  const autoFlag = form.countries ? getCountryFlag(form.countries) : '✈️';
  const autoTripName = form.nameOverride || autoName(form.countries, form.startDate);

  const handleCreate = async () => {
    if (!form.countries.trim() && !form.nameOverride.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTrip({
        name: autoTripName || form.countries.trim(),
        countries: form.countries.split(',').map(s => s.trim()).filter(Boolean),
        cities: form.cities.split(',').map(s => s.trim()).filter(Boolean),
        startDate: form.startDate,
        endDate: form.endDate,
        travelers: parseInt(form.travelers) || 2,
        travelerNames: form.travelerNames.split(',').map(s => s.trim()).filter(Boolean),
        status: form.status,
        coverEmoji: autoFlag,
        notes: form.notes,
        ownerId: user.uid,
        collaborators: [],
        members: [user.uid],
        createdAt: Date.now(),
      } as unknown as Trip & { members: string[] });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const nights = (trip: Trip) => {
    if (!trip.startDate || !trip.endDate) return null;
    const diff = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000);
    return diff > 0 ? diff : null;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">הטיולים שלנו</h1>
          <p className="text-slate-500 text-sm mt-0.5">{trips.length} טיולים</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow"
        >
          <Plus className="w-4 h-4" /> טיול חדש
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
          {/* Preview header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="text-3xl">{autoFlag}</span>
            <div>
              <p className="font-black text-slate-800 text-base leading-tight">
                {autoTripName || <span className="text-slate-300">שם הטיול יופיע כאן</span>}
              </p>
              <p className="text-xs text-slate-400">תצוגה מקדימה</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Country — primary field */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-slate-500 font-medium">מדינה / מדינות <span className="text-slate-300">(חובה)</span></label>
              <input
                className="input"
                placeholder="למשל: איטליה  או  צרפת, ספרד"
                value={form.countries}
                onChange={e => f('countries', e.target.value)}
                autoFocus
              />
            </div>

            {/* Optional name override */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-slate-500 font-medium">
                שם טיול מותאם <span className="text-slate-400">(אופציונלי — ברירת מחדל: {autoName(form.countries, form.startDate) || 'מדינה + שנה'})</span>
              </label>
              <input
                className="input"
                placeholder={autoName(form.countries, form.startDate) || 'למשל: חופשת קיץ 2026'}
                value={form.nameOverride}
                onChange={e => f('nameOverride', e.target.value)}
              />
            </div>

            <input className="input" placeholder="ערים (מופרד בפסיק)" value={form.cities} onChange={e => f('cities', e.target.value)} />
            <input type="number" className="input" placeholder="מספר נוסעים" value={form.travelers} onChange={e => f('travelers', e.target.value)} min="1" />

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">
                תאריך יציאה {form.startDate && <span className="text-blue-500 font-bold">{fmtDate(form.startDate)}</span>}
              </label>
              <input type="date" className="input" value={form.startDate} onChange={e => f('startDate', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">
                תאריך חזרה {form.endDate && <span className="text-blue-500 font-bold">{fmtDate(form.endDate)}</span>}
              </label>
              <input type="date" className="input" value={form.endDate} onChange={e => f('endDate', e.target.value)} />
            </div>

            <input className="input" placeholder="שמות נוסעים (מופרד בפסיק)" value={form.travelerNames} onChange={e => f('travelerNames', e.target.value)} />

            <select className="input" value={form.status} onChange={e => f('status', e.target.value as TripStatus)}>
              <option value="planning">בתכנון</option>
              <option value="partial">הוזמן חלקית</option>
              <option value="booked">הוזמן מלא</option>
              <option value="completed">הסתיים</option>
            </select>

            <textarea className="input sm:col-span-2 resize-none" rows={2} placeholder="הערות (אופציונלי)" value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} disabled={(!form.countries.trim() && !form.nameOverride.trim()) || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all">
              {saving ? 'שומר...' : 'צור טיול'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Trips grid */}
      {trips.length === 0 && !showForm && (
        <div className="text-center py-20 text-slate-400">
          <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">אין טיולים עדיין</p>
          <p className="text-sm mt-1">לחצו על "טיול חדש" כדי להתחיל</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {trips.map(trip => {
          const n = nights(trip);
          const status = STATUS_LABEL[trip.status];
          return (
            <div key={trip.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden group">
              <button type="button" onClick={() => onSelectTrip(trip)} className="w-full text-right">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{trip.coverEmoji}</span>
                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate">{trip.name}</h3>
                      </div>
                      {trip.countries.length > 0 && (
                        <p className="text-sm text-slate-500 truncate">{trip.countries.join(' · ')}</p>
                      )}
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                    {trip.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {fmtDate(trip.startDate)}
                        {n && ` · ${n} לילות`}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {trip.travelers} נוסעים
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </button>

              {/* Delete */}
              <div className="border-t border-slate-100 px-5 py-2 flex justify-end">
                {pendingDelete === trip.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">למחוק?</span>
                    <button type="button" onClick={() => { deleteTrip(trip.id); setPendingDelete(null); }} className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg">כן</button>
                    <button type="button" onClick={() => setPendingDelete(null)} className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg">לא</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setPendingDelete(trip.id)} className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripsList;

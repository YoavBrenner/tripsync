import React, { useState, useEffect } from 'react';
import type { TripAccommodation, AccommodationType } from '../types';
import { subscribeHotels, addHotel, deleteHotel } from '../services/tripService';
import { Plus, Building2, Trash2, ExternalLink, Mail, Sparkles, BellRing, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { parseHotelEmail } from '../utils/emailParser';

interface Props { tripId: string }

const TYPE_OPTIONS: { value: AccommodationType; label: string; icon: string }[] = [
  { value: 'hotel',   label: 'מלון',    icon: '🏨' },
  { value: 'airbnb',  label: 'Airbnb',  icon: '🏠' },
  { value: 'hostel',  label: 'הוסטל',   icon: '🛏' },
  { value: 'other',   label: 'אחר',     icon: '📍' },
];

const TYPE_COLOR: Record<AccommodationType, string> = {
  hotel:  'bg-blue-50 border-blue-200 text-blue-700',
  airbnb: 'bg-rose-50 border-rose-200 text-rose-700',
  hostel: 'bg-amber-50 border-amber-200 text-amber-700',
  other:  'bg-slate-50 border-slate-200 text-slate-600',
};

const TYPE_BADGE: Record<AccommodationType, string> = {
  hotel:  'bg-blue-100 text-blue-700',
  airbnb: 'bg-rose-100 text-rose-700',
  hostel: 'bg-amber-100 text-amber-700',
  other:  'bg-slate-100 text-slate-600',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

const EMPTY_FORM = {
  name: '', type: 'hotel' as AccommodationType,
  address: '', checkIn: '', checkOut: '',
  bookingUrl: '', confirmationNumber: '',
  price: '', currency: 'USD', paid: false, notes: '',
};

function nightsCount(a: string, b: string) {
  if (!a || !b) return null;
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : '—'; }

function isToday(d: string) {
  return d === new Date().toISOString().split('T')[0];
}
function isTomorrow(d: string) {
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  return d === tmr.toISOString().split('T')[0];
}

const inp = 'bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 w-full transition-all';

const TripHotels: React.FC<Props> = ({ tripId }) => {
  const [hotels, setHotels]             = useState<TripAccommodation[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [emailText, setEmailText]       = useState('');
  const [showEmailPaste, setShowEmailPaste] = useState(false);
  const [parseMsg, setParseMsg]         = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  useEffect(() => { return subscribeHotels(tripId, setHotels); }, [tripId]);

  const f = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleParseEmail = () => {
    if (!emailText.trim()) return;
    const parsed = parseHotelEmail(emailText);
    setForm(prev => ({
      ...prev,
      name:               parsed.name               ?? prev.name,
      checkIn:            parsed.checkIn             ?? prev.checkIn,
      checkOut:           parsed.checkOut            ?? prev.checkOut,
      confirmationNumber: parsed.confirmationNumber  ?? prev.confirmationNumber,
      address:            parsed.address             ?? prev.address,
      price:              parsed.price != null ? String(parsed.price) : prev.price,
      currency:           parsed.currency            ?? prev.currency,
    }));
    const filled = Object.values(parsed).filter(v => v != null).length;
    setParseMsg(filled > 0 ? `זוהו ${filled} שדות אוטומטית ✓` : 'לא זוהו פרטים — בדוק את הטקסט');
    setShowEmailPaste(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addHotel(tripId, {
        name: form.name.trim(), type: form.type,
        address: form.address.trim(), checkIn: form.checkIn, checkOut: form.checkOut,
        bookingUrl: form.bookingUrl.trim(), confirmationNumber: form.confirmationNumber.trim(),
        price: parseFloat(form.price) || 0, currency: form.currency,
        paid: form.paid, notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM); setShowForm(false); setEmailText(''); setParseMsg('');
    } finally { setSaving(false); }
  };

  const sorted = [...hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const totalILS = hotels.reduce((sum, h) => {
    const rate: Record<string, number> = { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 };
    return sum + (h.price || 0) * (rate[h.currency] ?? 1);
  }, 0);

  // Check-in alerts
  const todayCheckins    = sorted.filter(h => isToday(h.checkIn));
  const tomorrowCheckins = sorted.filter(h => isTomorrow(h.checkIn));

  const requestNotification = (hotelName: string, checkIn: string) => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(`צ'ק-אין: ${hotelName}`, {
          body: `היום — ${fmtDate(checkIn)}`,
          icon: '/vite.svg',
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Check-in alerts */}
      {todayCheckins.map(h => (
        <div key={h.id} className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
          <BellRing className="w-5 h-5 text-green-600 flex-shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">צ'ק-אין היום! 🎉</p>
            <p className="text-xs text-green-700">{h.name}</p>
          </div>
          <button type="button" onClick={() => requestNotification(h.name, h.checkIn)}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-xl font-bold">שלח התראה</button>
        </div>
      ))}
      {tomorrowCheckins.map(h => (
        <div key={h.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <BellRing className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">צ'ק-אין מחר</p>
            <p className="text-xs text-amber-700">{h.name}</p>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">לינה</h2>
          <p className="text-slate-500 text-sm">
            {hotels.length} הזמנות
            {totalILS > 0 && <span className="text-slate-700 font-semibold"> · סה"כ ~{Math.round(totalILS).toLocaleString()} ₪</span>}
          </p>
        </div>
        <button type="button" onClick={() => { setShowForm(v => !v); setParseMsg(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-sm shadow-blue-200">
          <Plus className="w-4 h-4" /> הוסף לינה
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-5 space-y-4">

          {/* Email parser */}
          <button type="button" onClick={() => setShowEmailPaste(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 hover:from-blue-100 transition-all">
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> הדבק אישור הזמנה — ימולא אוטומטית</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>

          {showEmailPaste && (
            <div className="space-y-2">
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none font-mono"
                rows={6}
                placeholder="הדבק כאן את טקסט האימייל / אישור הזמנה (Booking.com, Hotels.com, Airbnb...)&#10;&#10;כולל: תאריכי צ'ק-אין/אאוט, מספר אישור, מחיר"
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                dir="ltr"
              />
              <button type="button" onClick={handleParseEmail}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all">
                פרוס פרטים אוטומטית
              </button>
            </div>
          )}

          {parseMsg && (
            <p className={`text-xs font-medium px-3 py-2 rounded-xl ${parseMsg.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {parseMsg}
            </p>
          )}

          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => f('type', opt.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  form.type === opt.value ? TYPE_COLOR[opt.value] + ' border-2' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <span className="text-lg">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className={`${inp} col-span-2`} placeholder="שם המקום" value={form.name} onChange={e => f('name', e.target.value)} autoFocus />
            <input className={`${inp} col-span-2`} placeholder="כתובת" value={form.address} onChange={e => f('address', e.target.value)} />

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">
                צ'ק-אין {form.checkIn && <span className="text-blue-600 font-bold">{fmtDate(form.checkIn)}</span>}
              </label>
              <input type="date" className={inp} value={form.checkIn} onChange={e => f('checkIn', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">
                צ'ק-אאוט {form.checkOut && <span className="text-blue-600 font-bold">{fmtDate(form.checkOut)}</span>}
              </label>
              <input type="date" className={inp} value={form.checkOut} onChange={e => f('checkOut', e.target.value)} />
            </div>

            <input type="number" className={inp} placeholder="מחיר" value={form.price} onChange={e => f('price', e.target.value)} min="0" />
            <select className={inp} value={form.currency} onChange={e => f('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <input className={inp} placeholder="מספר אישור / קוד הזמנה" value={form.confirmationNumber} onChange={e => f('confirmationNumber', e.target.value)} />
            <input className={inp} placeholder="קישור הזמנה (https://...)" value={form.bookingUrl} onChange={e => f('bookingUrl', e.target.value)} />

            <label className="flex items-center gap-2 cursor-pointer col-span-2">
              <input type="checkbox" checked={form.paid} onChange={e => f('paid', e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-slate-700 font-medium">שולם</span>
            </label>

            <textarea className={`${inp} col-span-2 resize-none`} rows={2} placeholder="הערות" value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleAdd} disabled={!form.name.trim() || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-blue-200">
              {saving ? 'שומר...' : 'הוסף לינה'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setParseMsg(''); setEmailText(''); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {hotels.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">אין הזמנות לינה עדיין</p>
          <p className="text-sm mt-1">לחצו "הוסף לינה" או הדביקו אישור הזמנה</p>
        </div>
      )}

      {/* Hotels list */}
      <div className="space-y-3">
        {sorted.map(hotel => {
          const nights  = nightsCount(hotel.checkIn, hotel.checkOut);
          const isExp   = expandedId === hotel.id;
          const todayCI = isToday(hotel.checkIn);
          const tmrCI   = isTomorrow(hotel.checkIn);
          const mapsUrl = hotel.address
            ? `https://www.google.com/maps/search/${encodeURIComponent(hotel.address)}`
            : hotel.name
            ? `https://www.google.com/maps/search/${encodeURIComponent(hotel.name)}`
            : null;

          return (
            <div key={hotel.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${
              todayCI ? 'border-green-300' : tmrCI ? 'border-amber-200' : 'border-slate-200'
            }`}>
              <button type="button" className="w-full text-right p-4" onClick={() => setExpandedId(isExp ? null : hotel.id)}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${TYPE_COLOR[hotel.type]}`}>
                    {TYPE_OPTIONS.find(t => t.value === hotel.type)?.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[hotel.type]}`}>
                        {TYPE_OPTIONS.find(t => t.value === hotel.type)?.label}
                      </span>
                      {hotel.paid && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">שולם ✓</span>}
                      {todayCI && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-600 text-white">צ'ק-אין היום!</span>}
                      {tmrCI   && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">צ'ק-אין מחר</span>}
                    </div>
                    <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{hotel.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtDate(hotel.checkIn)} → {fmtDate(hotel.checkOut)}
                      {nights && <span className="text-slate-400"> · {nights} לילות</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hotel.price > 0 && <span className="text-sm font-bold text-slate-700">{hotel.price.toLocaleString()} {hotel.currency}</span>}
                    {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </button>

              {/* Expanded */}
              {isExp && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    {hotel.address         && <span className="col-span-2">{hotel.address}</span>}
                    {hotel.confirmationNumber && <span>אישור: <strong className="text-slate-700">{hotel.confirmationNumber}</strong></span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {mapsUrl && (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                        <MapPin className="w-3 h-3" /> במפה
                      </a>
                    )}
                    {hotel.bookingUrl && (
                      <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                        <ExternalLink className="w-3 h-3" /> קישור הזמנה
                      </a>
                    )}
                    {todayCI && (
                      <button type="button" onClick={() => requestNotification(hotel.name, hotel.checkIn)}
                        className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                        <BellRing className="w-3 h-3" /> שלח התראה
                      </button>
                    )}

                    <div className="mr-auto">
                      {pendingDelete === hotel.id ? (
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">למחוק?</span>
                          <button type="button" onClick={() => { deleteHotel(tripId, hotel.id); setPendingDelete(null); }}
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg">כן</button>
                          <button type="button" onClick={() => setPendingDelete(null)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg">לא</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setPendingDelete(hotel.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {hotel.notes && <p className="text-xs text-slate-400 italic">{hotel.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripHotels;

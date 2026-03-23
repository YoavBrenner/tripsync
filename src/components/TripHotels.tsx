import React, { useState, useEffect } from 'react';
import type { TripAccommodation, AccommodationType } from '../types';
import { subscribeHotels, addHotel, deleteHotel } from '../services/tripService';
import {
  Plus, Building2, Trash2, ExternalLink, Sparkles,
  BellRing, ChevronDown, ChevronUp, MapPin, Loader2,
  Mail, Image, Link2, Check,
} from 'lucide-react';
import ImagePasteArea from './ImagePasteArea';
import type { ParsedHotel } from '../../api/parse-hotel';

interface Props { tripId: string }

const TYPE_OPTIONS: { value: AccommodationType; label: string; icon: string }[] = [
  { value: 'hotel',   label: 'מלון',   icon: '🏨' },
  { value: 'airbnb',  label: 'Airbnb', icon: '🏠' },
  { value: 'hostel',  label: 'הוסטל',  icon: '🛏' },
  { value: 'other',   label: 'אחר',    icon: '📍' },
];

const TYPE_BADGE: Record<AccommodationType, string> = {
  hotel:  'bg-blue-100 text-blue-700',
  airbnb: 'bg-rose-100 text-rose-700',
  hostel: 'bg-amber-100 text-amber-700',
  other:  'bg-slate-100 text-slate-600',
};

function nightsCount(a: string, b: string) {
  if (!a || !b) return null;
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : '—'; }
function isToday(d: string)    { return d === new Date().toISOString().split('T')[0]; }
function isTomorrow(d: string) {
  const t = new Date(); t.setDate(t.getDate() + 1);
  return d === t.toISOString().split('T')[0];
}

const inp = 'bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 w-full transition-all';

// ── Hotel Scanner ────────────────────────────────────────────────────────────

type InputMethod = 'none' | 'image' | 'text' | 'url';

interface ScannerProps { tripId: string; onSaved: () => void }

const HotelScanner: React.FC<ScannerProps> = ({ tripId, onSaved }) => {
  const [method, setMethod]       = useState<InputMethod>('none');
  const [emailText, setEmailText] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [parsing, setParsing]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<ParsedHotel | null>(null);
  const [screenshot, setScreenshot] = useState('');
  const [saving, setSaving]       = useState(false);
  // Editable after parse
  const [name, setName]           = useState('');
  const [type, setType]           = useState<AccommodationType>('hotel');
  const [price, setPrice]         = useState('');
  const [currency, setCurrency]   = useState('USD');

  const applyResult = (p: ParsedHotel) => {
    setResult(p);
    setName(p.name || '');
    setPrice(p.price ? String(p.price) : '');
    setCurrency(p.currency || 'USD');
  };

  const parse = async (body: object) => {
    setParsing(true); setError('');
    try {
      const res = await fetch('/api/parse-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `שגיאה ${res.status}`);
      applyResult(await res.json() as ParsedHotel);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא ידועה');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await addHotel(tripId, {
        name: name || result.name,
        type,
        address: result.address || '',
        checkIn: result.checkIn || '',
        checkOut: result.checkOut || '',
        bookingUrl: result.bookingUrl || bookingUrl || '',
        confirmationNumber: result.confirmationNumber || '',
        price: parseFloat(price) || 0,
        currency,
        paid: false,
        notes: result.notes || '',
        ...(screenshot ? { screenshot } : {}),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" /> זיהוי פרטי לינה
        </span>
        <button type="button" onClick={onSaved} className="text-slate-400 hover:text-slate-600 text-sm">ביטול</button>
      </div>

      {/* Method selector */}
      {!result && !parsing && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setMethod(method === 'image' ? 'none' : 'image')}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-sm font-bold transition-all ${method === 'image' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Image className="w-5 h-5" /> צילום מסך / PDF
          </button>
          <button type="button" onClick={() => setMethod(method === 'text' ? 'none' : 'text')}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-sm font-bold transition-all ${method === 'text' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Mail className="w-5 h-5" /> טקסט מייל
          </button>
          <button type="button" onClick={() => setMethod(method === 'url' ? 'none' : 'url')}
            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-sm font-bold transition-all ${method === 'url' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Link2 className="w-5 h-5" /> קישור הזמנה
          </button>
        </div>
      )}

      {/* Image/PDF input */}
      {method === 'image' && !result && !parsing && (
        <ImagePasteArea
          value={screenshot}
          onChange={img => { setScreenshot(img); parse({ imageBase64: img }); }}
          label="הדבק צילום מסך / PDF של אישור המלון (Ctrl+V)"
        />
      )}

      {/* Email text input */}
      {method === 'text' && !result && !parsing && (
        <div className="space-y-2">
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none font-mono"
            rows={7}
            placeholder={"הדבק כאן את הטקסט מהמייל\n(Booking.com, Hotels.com, Airbnb, אגודה...)"}
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            dir="ltr"
          />
          <button type="button" onClick={() => parse({ text: emailText })} disabled={!emailText.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> זהה פרטים עם Claude
          </button>
        </div>
      )}

      {/* URL input */}
      {method === 'url' && !result && !parsing && (
        <div className="space-y-2">
          <input
            className={inp} dir="ltr"
            placeholder="https://booking.com/... / https://airbnb.com/..."
            value={bookingUrl}
            onChange={e => setBookingUrl(e.target.value)}
          />
          <p className="text-xs text-slate-400 text-center">הכנס קישור + הוסף את שאר הפרטים ידנית בהמשך</p>
          <button type="button" onClick={() => applyResult({ name: '', address: '', checkIn: '', checkOut: '', price: 0, currency: 'USD', confirmationNumber: '', bookingUrl, notes: '' })}
            disabled={!bookingUrl.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all">
            המשך
          </button>
        </div>
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div className="flex items-center justify-center gap-3 py-8 text-indigo-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium text-sm">Claude קורא את אישור ההזמנה...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-bold">שגיאה:</p><p>{error}</p>
          <button type="button" onClick={() => { setError(''); setMethod('none'); }}
            className="mt-1 text-xs underline">נסה שוב</button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-bold text-green-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> זוהו פרטי הלינה
            </p>
            {result.checkIn && (
              <p className="text-xs text-slate-700">
                📅 {fmtDate(result.checkIn)} → {fmtDate(result.checkOut)}
                {nightsCount(result.checkIn, result.checkOut) && ` · ${nightsCount(result.checkIn, result.checkOut)} לילות`}
              </p>
            )}
            {result.address && <p className="text-xs text-slate-500">📍 {result.address}</p>}
            {result.confirmationNumber && <p className="text-xs text-slate-500">אישור: <strong>{result.confirmationNumber}</strong></p>}
            {result.notes && <p className="text-xs text-slate-400 italic">{result.notes}</p>}
          </div>

          {/* Editable essentials */}
          <input className={inp} placeholder="שם המקום" value={name} onChange={e => setName(e.target.value)} />

          <div className="grid grid-cols-4 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-bold transition-all ${type === opt.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700 border-2' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <span>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="number" className={inp} placeholder="מחיר" value={price} onChange={e => setPrice(e.target.value)} min="0" />
            <select className={`${inp} w-28 flex-shrink-0`} value={currency} onChange={e => setCurrency(e.target.value)}>
              {['ILS','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving || !name.trim()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all">
              {saving ? 'שומר...' : `שמור — ${name || 'לינה'}`}
            </button>
            <button type="button" onClick={() => { setResult(null); setMethod('none'); setScreenshot(''); setEmailText(''); setBookingUrl(''); }}
              className="px-3 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm hover:bg-slate-200">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const TripHotels: React.FC<Props> = ({ tripId }) => {
  const [hotels, setHotels]               = useState<TripAccommodation[]>([]);
  const [showScanner, setShowScanner]     = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  useEffect(() => subscribeHotels(tripId, setHotels), [tripId]);

  const sorted = [...hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const totalILS = hotels.reduce((sum, h) => {
    const rate: Record<string, number> = { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 };
    return sum + (h.price || 0) * (rate[h.currency] ?? 1);
  }, 0);

  const todayCheckins    = sorted.filter(h => isToday(h.checkIn));
  const tomorrowCheckins = sorted.filter(h => isTomorrow(h.checkIn));

  const requestNotification = (hotelName: string, checkIn: string) => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(perm => {
      if (perm === 'granted')
        new Notification(`צ'ק-אין: ${hotelName}`, { body: `היום — ${fmtDate(checkIn)}`, icon: '/vite.svg' });
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
          {totalILS > 0 && <p className="text-slate-700 text-sm font-semibold">~{Math.round(totalILS).toLocaleString()} ₪</p>}
        </div>
        {!showScanner && (
          <button type="button" onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-sm">
            <Plus className="w-4 h-4" /> הוסף לינה
          </button>
        )}
      </div>

      {/* Scanner */}
      {showScanner && (
        <HotelScanner tripId={tripId} onSaved={() => setShowScanner(false)} />
      )}

      {/* Empty */}
      {hotels.length === 0 && !showScanner && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">אין הזמנות לינה עדיין</p>
          <p className="text-sm mt-1">לחצו "הוסף לינה" — מייל, צילום מסך, או קישור</p>
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
                  <div className="text-2xl flex-shrink-0">
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

              {isExp && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                  <div className="text-xs text-slate-500 space-y-1">
                    {hotel.address && <p>📍 {hotel.address}</p>}
                    {hotel.confirmationNumber && <p>אישור: <strong className="text-slate-700">{hotel.confirmationNumber}</strong></p>}
                    {hotel.notes && <p className="italic text-slate-400">{hotel.notes}</p>}
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
                        className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
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
                  {hotel.screenshot && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-100">
                      <img src={hotel.screenshot} alt="אישור" className="w-full object-contain max-h-64 bg-slate-50" />
                    </div>
                  )}
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

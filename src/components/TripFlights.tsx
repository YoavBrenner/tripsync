import React, { useState, useEffect } from 'react';
import type { TripFlight, FlightDirection } from '../types';
import { subscribeFlights, addFlight, deleteFlight } from '../services/tripService';
import { Plus, Plane, Trash2, ExternalLink, Mail, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { parseFlightEmail } from '../utils/emailParser';
import ImagePasteArea from './ImagePasteArea';

interface Props { tripId: string }

const DIRECTION_OPTIONS: { value: FlightDirection; label: string; color: string }[] = [
  { value: 'outbound', label: '✈ הלוך',    color: 'bg-blue-600'   },
  { value: 'return',   label: '✈ חזור',    color: 'bg-emerald-600' },
  { value: 'internal', label: '✈ פנימית',  color: 'bg-purple-600'  },
];

const DIR_BADGE: Record<FlightDirection, string> = {
  outbound: 'bg-blue-100 text-blue-700',
  return:   'bg-emerald-100 text-emerald-700',
  internal: 'bg-purple-100 text-purple-700',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

const EMPTY_FORM = {
  direction: 'outbound' as FlightDirection,
  airline: '', flightNumber: '',
  departureAirport: '', arrivalAirport: '',
  departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '',
  bookingRef: '', bookingUrl: '',
  price: '', currency: 'USD',
  luggageKg: '', notes: '', screenshot: '',
};

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : '—'; }

const inp = 'bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 w-full transition-all';

const TripFlights: React.FC<Props> = ({ tripId }) => {
  const [flights, setFlights]           = useState<TripFlight[]>([]);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [emailText, setEmailText]       = useState('');
  const [showEmailPaste, setShowEmailPaste] = useState(false);
  const [parseMsg, setParseMsg]         = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  useEffect(() => { return subscribeFlights(tripId, setFlights); }, [tripId]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleParseEmail = () => {
    if (!emailText.trim()) return;
    const parsed = parseFlightEmail(emailText);
    setForm(prev => ({
      ...prev,
      airline:          parsed.airline          ?? prev.airline,
      flightNumber:     parsed.flightNumber     ?? prev.flightNumber,
      departureAirport: parsed.departureAirport ?? prev.departureAirport,
      arrivalAirport:   parsed.arrivalAirport   ?? prev.arrivalAirport,
      departureDate:    parsed.departureDate    ?? prev.departureDate,
      departureTime:    parsed.departureTime    ?? prev.departureTime,
      arrivalDate:      parsed.arrivalDate      ?? prev.arrivalDate,
      arrivalTime:      parsed.arrivalTime      ?? prev.arrivalTime,
      bookingRef:       parsed.bookingRef       ?? prev.bookingRef,
      price:            parsed.price != null    ? String(parsed.price) : prev.price,
      currency:         parsed.currency         ?? prev.currency,
    }));
    const filled = Object.values(parsed).filter(v => v != null).length;
    setParseMsg(filled > 0 ? `זוהו ${filled} שדות אוטומטית ✓` : 'לא זוהו פרטים — בדוק את הטקסט');
    setShowEmailPaste(false);
  };

  const handleAdd = async () => {
    if (!form.airline.trim() && !form.flightNumber.trim()) return;
    setSaving(true);
    try {
      await addFlight(tripId, {
        direction:        form.direction,
        airline:          form.airline.trim(),
        flightNumber:     form.flightNumber.trim(),
        departureAirport: form.departureAirport.trim(),
        arrivalAirport:   form.arrivalAirport.trim(),
        departureDate:    form.departureDate,
        departureTime:    form.departureTime,
        arrivalDate:      form.arrivalDate,
        arrivalTime:      form.arrivalTime,
        bookingRef:       form.bookingRef.trim(),
        bookingUrl:       form.bookingUrl.trim(),
        price:            parseFloat(form.price) || 0,
        currency:         form.currency,
        luggageKg:        parseFloat(form.luggageKg) || 0,
        notes:            form.notes.trim(),
        ...(form.screenshot ? { screenshot: form.screenshot } : {}),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEmailText('');
      setParseMsg('');
    } finally { setSaving(false); }
  };

  const sorted = [...flights].sort((a, b) =>
    (a.departureDate + a.departureTime).localeCompare(b.departureDate + b.departureTime)
  );

  const totalILS = flights.reduce((sum, f) => {
    const rate: Record<string, number> = { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 };
    return sum + (f.price || 0) * (rate[f.currency] ?? 1);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">טיסות</h2>
          <p className="text-slate-500 text-sm">
            {flights.length} טיסות
            {totalILS > 0 && <span className="text-slate-700 font-semibold"> · סה"כ ~{Math.round(totalILS).toLocaleString()} ₪</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(v => !v); setParseMsg(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> הוסף טיסה
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-5 space-y-4">

          {/* Email parser toggle */}
          <button
            type="button"
            onClick={() => setShowEmailPaste(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 hover:from-blue-100 transition-all"
          >
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> הדבק אימייל / כרטיס טיסה — ימולא אוטומטית</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>

          {showEmailPaste && (
            <div className="space-y-2">
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none font-mono"
                rows={6}
                placeholder="הדבק כאן את טקסט האימייל / אישור הזמנה..."
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleParseEmail}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
              >
                פרוס פרטים אוטומטית
              </button>
            </div>
          )}

          {parseMsg && (
            <p className={`text-xs font-medium px-3 py-2 rounded-xl ${parseMsg.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {parseMsg}
            </p>
          )}

          {/* Direction */}
          <div className="flex gap-2">
            {DIRECTION_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => f('direction', opt.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  form.direction === opt.value
                    ? `${opt.color} text-white shadow-sm`
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className={inp} placeholder="חברת תעופה" value={form.airline} onChange={e => f('airline', e.target.value)} />
            <input className={inp} placeholder="מס' טיסה (LY001)" value={form.flightNumber} onChange={e => f('flightNumber', e.target.value)} />

            <div className="col-span-2 flex items-center gap-2">
              <input className={inp} placeholder="שדה יציאה (TLV)" value={form.departureAirport} onChange={e => f('departureAirport', e.target.value)} />
              <span className="text-slate-400 text-lg flex-shrink-0">→</span>
              <input className={inp} placeholder="שדה הגעה (FCO)" value={form.arrivalAirport} onChange={e => f('arrivalAirport', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">יציאה {form.departureDate && <span className="text-blue-600 font-bold">{fmtDate(form.departureDate)}</span>}</label>
              <input type="date" className={inp} value={form.departureDate} onChange={e => f('departureDate', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">שעת יציאה</label>
              <input type="time" className={inp} value={form.departureTime} onChange={e => f('departureTime', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">הגעה {form.arrivalDate && <span className="text-blue-600 font-bold">{fmtDate(form.arrivalDate)}</span>}</label>
              <input type="date" className={inp} value={form.arrivalDate} onChange={e => f('arrivalDate', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">שעת הגעה</label>
              <input type="time" className={inp} value={form.arrivalTime} onChange={e => f('arrivalTime', e.target.value)} />
            </div>

            <input className={inp} placeholder="קוד הזמנה / PNR" value={form.bookingRef} onChange={e => f('bookingRef', e.target.value)} />
            <input className={inp} placeholder="קישור להזמנה" value={form.bookingUrl} onChange={e => f('bookingUrl', e.target.value)} />

            <input type="number" className={inp} placeholder="מחיר" value={form.price} onChange={e => f('price', e.target.value)} min="0" />
            <select className={inp} value={form.currency} onChange={e => f('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <input type="number" className={`${inp} col-span-2`} placeholder="משקל מזוודה (ק&quot;ג)" value={form.luggageKg} onChange={e => f('luggageKg', e.target.value)} min="0" />
            <textarea className={`${inp} col-span-2 resize-none`} rows={2} placeholder="הערות (אופציונלי)" value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          <ImagePasteArea
            value={form.screenshot}
            onChange={v => f('screenshot', v)}
            label="צלם מסך כרטיס טיסה — הדבק כאן"
          />

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleAdd} disabled={(!form.airline.trim() && !form.flightNumber.trim()) || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-blue-200">
              {saving ? 'שומר...' : 'הוסף טיסה'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setParseMsg(''); setEmailText(''); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {flights.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Plane className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">אין טיסות עדיין</p>
          <p className="text-sm mt-1">לחצו "הוסף טיסה" או הדביקו אישור הזמנה</p>
        </div>
      )}

      {/* Flights list */}
      <div className="space-y-3">
        {sorted.map(flight => {
          const isExpanded = expandedId === flight.id;
          return (
            <div key={flight.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              {/* Main row */}
              <button type="button" className="w-full text-right p-4" onClick={() => setExpandedId(isExpanded ? null : flight.id)}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    flight.direction === 'outbound' ? 'bg-blue-100' : flight.direction === 'return' ? 'bg-emerald-100' : 'bg-purple-100'
                  }`}>
                    <Plane className={`w-4 h-4 ${
                      flight.direction === 'outbound' ? 'text-blue-600' : flight.direction === 'return' ? 'text-emerald-600' : 'text-purple-600'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${DIR_BADGE[flight.direction]}`}>
                        {DIRECTION_OPTIONS.find(d => d.value === flight.direction)?.label}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {flight.airline}{flight.flightNumber && ` ${flight.flightNumber}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-600 font-medium">
                      {(flight.departureAirport || flight.arrivalAirport) && (
                        <span>{flight.departureAirport} → {flight.arrivalAirport}</span>
                      )}
                      {flight.departureDate && (
                        <span className="text-xs text-slate-400">{fmtDate(flight.departureDate)}{flight.departureTime && ` ${flight.departureTime}`}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {flight.price > 0 && (
                      <span className="text-sm font-bold text-slate-700">{flight.price.toLocaleString()} {flight.currency}</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    {flight.departureDate && <span>יציאה: {fmtDate(flight.departureDate)} {flight.departureTime}</span>}
                    {flight.arrivalDate   && <span>הגעה: {fmtDate(flight.arrivalDate)} {flight.arrivalTime}</span>}
                    {flight.luggageKg > 0 && <span>מזוודה: {flight.luggageKg} ק"ג</span>}
                    {flight.bookingRef    && <span>קוד: <strong className="text-slate-700">{flight.bookingRef}</strong></span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {flight.bookingUrl && (
                      <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                        <ExternalLink className="w-3 h-3" /> קישור הזמנה
                      </a>
                    )}

                    <div className="mr-auto">
                      {pendingDelete === flight.id ? (
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">למחוק?</span>
                          <button type="button" onClick={() => { deleteFlight(tripId, flight.id); setPendingDelete(null); }}
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg">כן</button>
                          <button type="button" onClick={() => setPendingDelete(null)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg">לא</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setPendingDelete(flight.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {flight.notes && <p className="text-xs text-slate-400 italic">{flight.notes}</p>}

                  {flight.screenshot && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-100">
                      <img src={flight.screenshot} alt="כרטיס טיסה" className="w-full object-contain max-h-64 bg-slate-50" />
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

export default TripFlights;

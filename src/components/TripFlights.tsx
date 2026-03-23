import React, { useState, useEffect } from 'react';
import type { TripFlight, FlightDirection } from '../types';
import { subscribeFlights, addFlight, deleteFlight } from '../services/tripService';
import { Plus, Plane, Trash2, ExternalLink, Sparkles, User, Loader2, Check, FileText } from 'lucide-react';
import ImagePasteArea from './ImagePasteArea';
import type { ParsedTicket } from '../../api/parse-ticket';

interface Props { tripId: string }

const DIR_OPTIONS: { value: FlightDirection; label: string }[] = [
  { value: 'outbound', label: 'הלוך'   },
  { value: 'return',   label: 'חזור'   },
  { value: 'internal', label: 'פנימית' },
];

const DIR_BADGE: Record<FlightDirection, string> = {
  outbound: 'bg-blue-100 text-blue-700',
  return:   'bg-emerald-100 text-emerald-700',
  internal: 'bg-purple-100 text-purple-700',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];
const inp = 'bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 w-full transition-all';

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : '—'; }

function guessDirection(idx: number, total: number, from: string, to: string): FlightDirection {
  if (total <= 1) return 'outbound';
  if (idx === 0) return 'outbound';
  if (idx === total - 1) return 'return';
  // internal if neither departure nor arrival is TLV/BGN
  const tlv = /TLV|BGN|LOD/i;
  if (!tlv.test(from) && !tlv.test(to)) return 'internal';
  return 'return';
}

function groupByTraveler(flights: TripFlight[]): [string, TripFlight[]][] {
  const map = new Map<string, TripFlight[]>();
  for (const f of flights) {
    const key = f.travelerName?.trim() || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }
  for (const arr of map.values())
    arr.sort((a, b) => (a.departureDate + a.departureTime).localeCompare(b.departureDate + b.departureTime));
  return [...map.entries()].sort((a, b) => {
    if (!a[0] && b[0]) return 1;
    if (a[0] && !b[0]) return -1;
    return a[0].localeCompare(b[0]);
  });
}

// ── Ticket scanner component ───────────────────────────────────────────────

interface ScanResult {
  ticket: ParsedTicket;
  screenshot: string;
}

interface TicketScannerProps {
  onSaved: () => void;
  tripId: string;
}

const TicketScanner: React.FC<TicketScannerProps> = ({ onSaved, tripId }) => {
  const [screenshot, setScreenshot]   = useState('');
  const [scanning, setScanning]       = useState(false);
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  // Editable fields after scan
  const [travelerName, setTravelerName] = useState('');
  const [price, setPrice]               = useState('');
  const [currency, setCurrency]         = useState('USD');

  const handleScan = async (img: string) => {
    setScreenshot(img);
    setResult(null);
    setError('');
    setScanning(true);
    try {
      const res = await fetch('/api/parse-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: img }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? `שגיאה ${res.status}`);
      }
      const ticket = await res.json() as ParsedTicket;
      setResult({ ticket, screenshot: img });
      setTravelerName(ticket.passengerName ?? '');
      setPrice(ticket.price && ticket.price > 0 ? String(ticket.price) : '');
      setCurrency(ticket.currency || 'USD');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא ידועה');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const { ticket } = result;
      const total = ticket.flights.length;
      for (let i = 0; i < total; i++) {
        const f = ticket.flights[i];
        await addFlight(tripId, {
          travelerName: travelerName || ticket.passengerName,
          direction: guessDirection(i, total, f.fromAirport, f.toAirport),
          airline: f.airline,
          flightNumber: f.flightNumber,
          departureAirport: f.fromAirport,
          arrivalAirport: f.toAirport,
          departureDate: f.departureDate,
          departureTime: f.departureTime,
          arrivalDate: f.arrivalDate,
          arrivalTime: f.arrivalTime,
          bookingRef: ticket.bookingCode,
          bookingUrl: '',
          price: i === 0 ? (parseFloat(price) || 0) : 0,
          currency,
          luggageKg: f.baggagePieces * 23,
          notes: f.seat ? `מושב: ${f.seat}` : '',
          ...(i === 0 && result.screenshot ? { screenshot: result.screenshot } : {}),
        } as Omit<TripFlight, 'id'>);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" /> סריקת כרטיס טיסה
        </span>
        <button type="button" onClick={onSaved} className="text-slate-400 hover:text-slate-600 text-sm">ביטול</button>
      </div>

      {!screenshot && !scanning && (
        <ImagePasteArea
          value=""
          onChange={handleScan}
          label="הדבק תמונת כרטיס טיסה (Ctrl+V)"
        />
      )}

      {scanning && (
        <div className="flex items-center justify-center gap-3 py-8 text-blue-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium text-sm">Claude קורא את הכרטיס...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-bold">שגיאה:</p>
          <p>{error}</p>
          {error.includes('ANTHROPIC_API_KEY') && (
            <p className="mt-1 text-xs">הוסף <code className="bg-red-100 px-1 rounded">ANTHROPIC_API_KEY</code> ב-Vercel → Settings → Environment Variables</p>
          )}
          <button type="button" onClick={() => { setError(''); setScreenshot(''); }}
            className="mt-2 text-xs underline text-red-500">נסה שוב</button>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Extracted flights */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-green-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> זוהו {result.ticket.flights.length} טיסות
            </p>
            {result.ticket.flights.map((f, i) => (
              <div key={i} className="text-xs text-slate-700 flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  i === 0 ? 'bg-blue-100 text-blue-700' : i === result.ticket.flights.length - 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {i === 0 ? 'הלוך' : i === result.ticket.flights.length - 1 ? 'חזור' : 'פנימית'}
                </span>
                <span className="font-semibold">{f.fromAirport} → {f.toAirport}</span>
                <span className="text-slate-500">{fmtDate(f.departureDate)} {f.departureTime}</span>
                <span className="text-slate-500">{f.flightNumber}</span>
                {f.seat && <span className="text-slate-400">מושב {f.seat}</span>}
              </div>
            ))}
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3 h-3" /> שם נוסע
              </label>
              <input className={inp} value={travelerName} onChange={e => setTravelerName(e.target.value)} placeholder="שם מלא" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">מחיר כולל</label>
              <input type="number" className={inp} value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min="0" />
            </div>
            <select className={inp} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-blue-200">
              {saving ? 'שומר...' : `שמור עבור ${travelerName || result.ticket.passengerName}`}
            </button>
            <button type="button" onClick={() => { setScreenshot(''); setResult(null); setError(''); }}
              className="px-3 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-200">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  direction: 'outbound' as FlightDirection,
  travelerName: '', airline: '', flightNumber: '',
  departureAirport: '', arrivalAirport: '',
  departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '',
  bookingRef: '', bookingUrl: '',
  price: '', currency: 'USD',
  luggageKg: '', notes: '', screenshot: '',
};

const TripFlights: React.FC<Props> = ({ tripId }) => {
  const [flights, setFlights]     = useState<TripFlight[]>([]);
  const [mode, setMode]           = useState<'none' | 'scan' | 'manual'>('none');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => subscribeFlights(tripId, setFlights), [tripId]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.airline.trim() && !form.flightNumber.trim()) return;
    setSaving(true);
    try {
      await addFlight(tripId, {
        direction: form.direction,
        travelerName: form.travelerName.trim() || undefined,
        airline: form.airline.trim(), flightNumber: form.flightNumber.trim(),
        departureAirport: form.departureAirport.trim(), arrivalAirport: form.arrivalAirport.trim(),
        departureDate: form.departureDate, departureTime: form.departureTime,
        arrivalDate: form.arrivalDate, arrivalTime: form.arrivalTime,
        bookingRef: form.bookingRef.trim(), bookingUrl: form.bookingUrl.trim(),
        price: parseFloat(form.price) || 0, currency: form.currency,
        luggageKg: parseFloat(form.luggageKg) || 0, notes: form.notes.trim(),
        ...(form.screenshot ? { screenshot: form.screenshot } : {}),
      } as Omit<TripFlight, 'id'>);
      setForm(EMPTY_FORM); setMode('none');
    } finally { setSaving(false); }
  };

  const groups   = groupByTraveler(flights);
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
          {totalILS > 0 && <p className="text-slate-700 text-sm font-semibold">~{Math.round(totalILS).toLocaleString()} ₪</p>}
        </div>
        <div className="flex gap-2">
          {mode !== 'scan' && (
            <button type="button" onClick={() => setMode('scan')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-sm">
              <Sparkles className="w-4 h-4" /> סרוק כרטיס
            </button>
          )}
          {mode !== 'scan' && (
            <button type="button" onClick={() => setMode(mode === 'manual' ? 'none' : 'manual')}
              className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket scanner */}
      {mode === 'scan' && (
        <TicketScanner
          tripId={tripId}
          onSaved={() => setMode('none')}
        />
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <span className="font-bold text-slate-700 block">הוספה ידנית</span>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium flex items-center gap-1"><User className="w-3 h-3" /> שם נוסע</label>
            <input className={inp} placeholder="יואב, רון..." value={form.travelerName} onChange={e => f('travelerName', e.target.value)} />
          </div>

          <div className="flex gap-2">
            {DIR_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => f('direction', opt.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${form.direction === opt.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                ✈ {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className={inp} placeholder="חברת תעופה" value={form.airline} onChange={e => f('airline', e.target.value)} />
            <input className={inp} placeholder="מס' טיסה" value={form.flightNumber} onChange={e => f('flightNumber', e.target.value)} />
            <div className="col-span-2 flex items-center gap-2">
              <input className={inp} placeholder="יציאה (TLV)" value={form.departureAirport} onChange={e => f('departureAirport', e.target.value)} />
              <span className="text-slate-400 flex-shrink-0">→</span>
              <input className={inp} placeholder="הגעה (FCO)" value={form.arrivalAirport} onChange={e => f('arrivalAirport', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">יציאה {form.departureDate && <b className="text-blue-600">{fmtDate(form.departureDate)}</b>}</label>
              <input type="date" className={inp} value={form.departureDate} onChange={e => f('departureDate', e.target.value)} />
            </div>
            <input type="time" className={inp} value={form.departureTime} onChange={e => f('departureTime', e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">הגעה {form.arrivalDate && <b className="text-blue-600">{fmtDate(form.arrivalDate)}</b>}</label>
              <input type="date" className={inp} value={form.arrivalDate} onChange={e => f('arrivalDate', e.target.value)} />
            </div>
            <input type="time" className={inp} value={form.arrivalTime} onChange={e => f('arrivalTime', e.target.value)} />
            <input className={inp} placeholder="קוד הזמנה" value={form.bookingRef} onChange={e => f('bookingRef', e.target.value)} />
            <input className={inp} placeholder="קישור הזמנה" value={form.bookingUrl} onChange={e => f('bookingUrl', e.target.value)} />
            <input type="number" className={inp} placeholder="מחיר" value={form.price} onChange={e => f('price', e.target.value)} min="0" />
            <select className={inp} value={form.currency} onChange={e => f('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <ImagePasteArea value={form.screenshot} onChange={v => f('screenshot', v)} label="צלם מסך כרטיס (Ctrl+V)" />

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={(!form.airline.trim() && !form.flightNumber.trim()) || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all">
              {saving ? 'שומר...' : 'הוסף'}
            </button>
            <button type="button" onClick={() => setMode('none')} className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">ביטול</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {flights.length === 0 && mode === 'none' && (
        <div className="text-center py-16 text-slate-400">
          <Plane className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">אין טיסות עדיין</p>
          <p className="text-sm mt-1">לחצו "סרוק כרטיס" כדי להוסיף מתמונה</p>
        </div>
      )}

      {/* Grouped by traveler */}
      <div className="space-y-5">
        {groups.map(([traveler, travelerFlights]) => {
          const screenshot = travelerFlights.find(f => f.screenshot)?.screenshot;
          return (
            <div key={traveler || '__none__'} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="font-bold text-slate-700 text-sm">{traveler || 'טיסות כלליות'}</span>
                <div className="mr-auto flex items-center gap-2">
                  {screenshot && (
                    <a
                      href={screenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`${traveler || 'ticket'}.${screenshot.startsWith('data:application/pdf') ? 'pdf' : 'jpg'}`}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                      onClick={e => {
                        if (screenshot.startsWith('data:application/pdf')) {
                          e.preventDefault();
                          const byteStr = atob(screenshot.split(',')[1]);
                          const arr = new Uint8Array(byteStr.length);
                          for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
                          const blob = new Blob([arr], { type: 'application/pdf' });
                          window.open(URL.createObjectURL(blob), '_blank');
                        }
                      }}
                    >
                      <FileText className="w-3.5 h-3.5" /> כרטיס
                    </a>
                  )}
                </div>
              </div>

              {screenshot && (
                <div className="border-b border-slate-100">
                  <img src={screenshot} alt="כרטיס" className="w-full object-contain max-h-72 bg-slate-50" />
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {travelerFlights.map(flight => (
                  <div key={flight.id} className="px-4 py-3 flex items-start gap-3">
                    <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${DIR_BADGE[flight.direction]}`}>
                      {DIR_OPTIONS.find(d => d.value === flight.direction)?.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(flight.departureAirport || flight.arrivalAirport) && (
                          <span className="font-bold text-slate-800 text-sm">{flight.departureAirport} → {flight.arrivalAirport}</span>
                        )}
                        {flight.airline && <span className="text-xs text-slate-500">{flight.airline} {flight.flightNumber}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                        {flight.departureDate && <span>✈ {fmtDate(flight.departureDate)} {flight.departureTime}</span>}
                        {flight.arrivalDate   && <span>🛬 {fmtDate(flight.arrivalDate)} {flight.arrivalTime}</span>}
                        {flight.luggageKg > 0 && <span>🧳 {flight.luggageKg} ק"ג</span>}
                        {flight.bookingRef    && <span>קוד: <strong className="text-slate-700 font-mono">{flight.bookingRef}</strong></span>}
                        {flight.notes         && <span className="italic text-slate-400">{flight.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {flight.price > 0 && <span className="text-xs font-bold text-slate-700">{flight.price.toLocaleString()} {flight.currency}</span>}
                        {flight.bookingUrl && (
                          <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                            <ExternalLink className="w-3 h-3" /> הזמנה
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {pendingDelete === flight.id ? (
                        <span className="flex items-center gap-1">
                          <button type="button" onClick={() => { deleteFlight(tripId, flight.id); setPendingDelete(null); }}
                            className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg">מחק</button>
                          <button type="button" onClick={() => setPendingDelete(null)}
                            className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg">לא</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setPendingDelete(flight.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripFlights;

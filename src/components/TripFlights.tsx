import React, { useState, useEffect } from 'react';
import { TripFlight, FlightDirection } from '../types';
import { subscribeFlights, addFlight, deleteFlight } from '../services/tripService';
import { Plus, Plane, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  tripId: string;
}

const DIRECTION_OPTIONS: { value: FlightDirection; label: string }[] = [
  { value: 'outbound',  label: 'הלוך' },
  { value: 'return',    label: 'חזור' },
  { value: 'internal',  label: 'פנימית' },
];

const DIRECTION_COLOR: Record<FlightDirection, string> = {
  outbound: 'bg-blue-100 text-blue-700',
  return:   'bg-green-100 text-green-700',
  internal: 'bg-purple-100 text-purple-700',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

const EMPTY_FORM = {
  direction: 'outbound' as FlightDirection,
  airline: '',
  flightNumber: '',
  departureAirport: '',
  arrivalAirport: '',
  departureDate: '',
  departureTime: '',
  arrivalDate: '',
  arrivalTime: '',
  bookingRef: '',
  bookingUrl: '',
  price: '',
  currency: 'ILS',
  luggageKg: '',
  notes: '',
};

const TripFlights: React.FC<Props> = ({ tripId }) => {
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return subscribeFlights(tripId, setFlights);
  }, [tripId]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.airline.trim() && !form.flightNumber.trim()) return;
    setSaving(true);
    try {
      await addFlight(tripId, {
        direction: form.direction,
        airline: form.airline.trim(),
        flightNumber: form.flightNumber.trim(),
        departureAirport: form.departureAirport.trim(),
        arrivalAirport: form.arrivalAirport.trim(),
        departureDate: form.departureDate,
        departureTime: form.departureTime,
        arrivalDate: form.arrivalDate,
        arrivalTime: form.arrivalTime,
        bookingRef: form.bookingRef.trim(),
        bookingUrl: form.bookingUrl.trim(),
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        luggageKg: parseFloat(form.luggageKg) || 0,
        notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFlight(tripId, id);
    setPendingDelete(null);
  };

  // Sort flights by departure date
  const sorted = [...flights].sort((a, b) => {
    const da = a.departureDate + a.departureTime;
    const db = b.departureDate + b.departureTime;
    return da.localeCompare(db);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">טיסות</h2>
          <p className="text-slate-500 text-sm">{flights.length} טיסות</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow"
        >
          <Plus className="w-4 h-4" /> הוסף טיסה
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
          <span className="font-bold text-slate-700 block">טיסה חדשה</span>

          {/* Direction toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">כיוון</label>
            <div className="flex gap-2">
              {DIRECTION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => f('direction', opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.direction === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="חברת תעופה"
              value={form.airline}
              onChange={e => f('airline', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="מספר טיסה (למשל: LY001)"
              value={form.flightNumber}
              onChange={e => f('flightNumber', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="שדה תעופה יציאה (TLV)"
              value={form.departureAirport}
              onChange={e => f('departureAirport', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="שדה תעופה הגעה (FCO)"
              value={form.arrivalAirport}
              onChange={e => f('arrivalAirport', e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">תאריך יציאה</label>
              <input
                type="date"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.departureDate}
                onChange={e => f('departureDate', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">שעת יציאה</label>
              <input
                type="time"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.departureTime}
                onChange={e => f('departureTime', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">תאריך הגעה</label>
              <input
                type="date"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.arrivalDate}
                onChange={e => f('arrivalDate', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">שעת הגעה</label>
              <input
                type="time"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.arrivalTime}
                onChange={e => f('arrivalTime', e.target.value)}
              />
            </div>
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="קוד הזמנה"
              value={form.bookingRef}
              onChange={e => f('bookingRef', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="קישור להזמנה (https://...)"
              value={form.bookingUrl}
              onChange={e => f('bookingUrl', e.target.value)}
            />
            <input
              type="number"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="מחיר"
              value={form.price}
              onChange={e => f('price', e.target.value)}
              min="0"
            />
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={form.currency}
              onChange={e => f('currency', e.target.value)}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2"
              placeholder="משקל מזוודה (ק&quot;ג)"
              value={form.luggageKg}
              onChange={e => f('luggageKg', e.target.value)}
              min="0"
            />
            <textarea
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2 resize-none"
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
              disabled={(!form.airline.trim() && !form.flightNumber.trim()) || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all"
            >
              {saving ? 'שומר...' : 'הוסף טיסה'}
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
      {flights.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Plane className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">אין טיסות עדיין</p>
          <p className="text-sm mt-1">לחצו על "הוסף טיסה" כדי להתחיל</p>
        </div>
      )}

      {/* Flights list */}
      <div className="space-y-3">
        {sorted.map(flight => (
          <div key={flight.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 mt-0.5">
                  <Plane className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${DIRECTION_COLOR[flight.direction]}`}>
                      {DIRECTION_OPTIONS.find(d => d.value === flight.direction)?.label}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {flight.airline}{flight.flightNumber && ` · ${flight.flightNumber}`}
                    </span>
                  </div>

                  {/* Route */}
                  {(flight.departureAirport || flight.arrivalAirport) && (
                    <p className="text-sm text-slate-700 font-medium mb-1">
                      {flight.departureAirport} → {flight.arrivalAirport}
                    </p>
                  )}

                  {/* Times */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {flight.departureDate && (
                      <span>
                        יציאה: {flight.departureDate.split('-').reverse().join('/')}
                        {flight.departureTime && ` ${flight.departureTime}`}
                      </span>
                    )}
                    {flight.arrivalDate && (
                      <span>
                        הגעה: {flight.arrivalDate.split('-').reverse().join('/')}
                        {flight.arrivalTime && ` ${flight.arrivalTime}`}
                      </span>
                    )}
                  </div>

                  {/* Price + luggage */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1">
                    {flight.price > 0 && (
                      <span className="font-medium text-slate-700">{flight.price.toLocaleString()} {flight.currency}</span>
                    )}
                    {flight.luggageKg > 0 && <span>מזוודה: {flight.luggageKg} ק"ג</span>}
                    {flight.bookingRef && <span>קוד: {flight.bookingRef}</span>}
                  </div>

                  {flight.bookingUrl && (
                    <a
                      href={flight.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      קישור להזמנה
                    </a>
                  )}

                  {flight.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">{flight.notes}</p>
                  )}
                </div>
              </div>

              {/* Delete */}
              <div className="flex-shrink-0">
                {pendingDelete === flight.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">בטוח?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(flight.id)}
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
                    onClick={() => setPendingDelete(flight.id)}
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
  );
};

export default TripFlights;

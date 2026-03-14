import React, { useState, useEffect } from 'react';
import { TripAccommodation, AccommodationType } from '../types';
import { subscribeHotels, addHotel, deleteHotel } from '../services/tripService';
import { Plus, Building2, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  tripId: string;
}

const TYPE_OPTIONS: { value: AccommodationType; label: string }[] = [
  { value: 'hotel',   label: 'מלון' },
  { value: 'airbnb',  label: 'Airbnb' },
  { value: 'hostel',  label: 'הוסטל' },
  { value: 'other',   label: 'אחר' },
];

const TYPE_COLOR: Record<AccommodationType, string> = {
  hotel:   'bg-blue-100 text-blue-700',
  airbnb:  'bg-pink-100 text-pink-700',
  hostel:  'bg-yellow-100 text-yellow-700',
  other:   'bg-slate-100 text-slate-600',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

const EMPTY_FORM = {
  name: '',
  type: 'hotel' as AccommodationType,
  address: '',
  checkIn: '',
  checkOut: '',
  bookingUrl: '',
  confirmationNumber: '',
  price: '',
  currency: 'ILS',
  paid: false,
  notes: '',
};

function nightsCount(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null;
  const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

const TripHotels: React.FC<Props> = ({ tripId }) => {
  const [hotels, setHotels] = useState<TripAccommodation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return subscribeHotels(tripId, setHotels);
  }, [tripId]);

  const f = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addHotel(tripId, {
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        bookingUrl: form.bookingUrl.trim(),
        confirmationNumber: form.confirmationNumber.trim(),
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        paid: form.paid,
        notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteHotel(tripId, id);
    setPendingDelete(null);
  };

  const sorted = [...hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">לינה</h2>
          <p className="text-slate-500 text-sm">{hotels.length} הזמנות</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow"
        >
          <Plus className="w-4 h-4" /> הוסף לינה
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
          <span className="font-bold text-slate-700 block">לינה חדשה</span>

          {/* Type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">סוג</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => f('type', opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.type === opt.value
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
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2"
              placeholder="שם המקום"
              value={form.name}
              onChange={e => f('name', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2"
              placeholder="כתובת"
              value={form.address}
              onChange={e => f('address', e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">צ'ק-אין</label>
              <input
                type="date"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.checkIn}
                onChange={e => f('checkIn', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">צ'ק-אאוט</label>
              <input
                type="date"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
                value={form.checkOut}
                onChange={e => f('checkOut', e.target.value)}
              />
            </div>
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
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="מספר אישור / קוד הזמנה"
              value={form.confirmationNumber}
              onChange={e => f('confirmationNumber', e.target.value)}
            />
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="קישור להזמנה (https://...)"
              value={form.bookingUrl}
              onChange={e => f('bookingUrl', e.target.value)}
            />

            {/* Paid checkbox */}
            <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={form.paid}
                onChange={e => f('paid', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-blue-600"
              />
              <span className="text-sm text-slate-700 font-medium">שולם</span>
            </label>

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
              disabled={!form.name.trim() || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all"
            >
              {saving ? 'שומר...' : 'הוסף לינה'}
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
      {hotels.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">אין הזמנות לינה עדיין</p>
          <p className="text-sm mt-1">לחצו על "הוסף לינה" כדי להתחיל</p>
        </div>
      )}

      {/* Hotels list */}
      <div className="space-y-3">
        {sorted.map(hotel => {
          const nights = nightsCount(hotel.checkIn, hotel.checkOut);
          return (
            <div key={hotel.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLOR[hotel.type]}`}>
                      {TYPE_OPTIONS.find(t => t.value === hotel.type)?.label}
                    </span>
                    {hotel.paid && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        שולם
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm mb-1">{hotel.name}</h3>

                  {(hotel.checkIn || hotel.checkOut) && (
                    <p className="text-sm text-slate-600 mb-1">
                      {fmtDate(hotel.checkIn)} → {fmtDate(hotel.checkOut)}
                      {nights && (
                        <span className="text-slate-400 text-xs mr-1">({nights} לילות)</span>
                      )}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {hotel.price > 0 && (
                      <span className="font-medium text-slate-700">{hotel.price.toLocaleString()} {hotel.currency}</span>
                    )}
                    {hotel.address && <span>{hotel.address}</span>}
                    {hotel.confirmationNumber && <span>קוד: {hotel.confirmationNumber}</span>}
                  </div>

                  {hotel.bookingUrl && (
                    <a
                      href={hotel.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      קישור להזמנה
                    </a>
                  )}

                  {hotel.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">{hotel.notes}</p>
                  )}
                </div>

                {/* Delete */}
                <div className="flex-shrink-0">
                  {pendingDelete === hotel.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">בטוח?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(hotel.id)}
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
                      onClick={() => setPendingDelete(hotel.id)}
                      className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripHotels;

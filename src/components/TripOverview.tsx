import React, { useState } from 'react';
import type { Trip, TripStatus } from '../types';
import { updateTrip } from '../services/tripService';
import { Calendar, Users, MapPin, Globe, Pencil, Check, X } from 'lucide-react';

interface Props {
  trip: Trip;
  onTripUpdated: (t: Trip) => void;
}

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'planning',  label: 'בתכנון' },
  { value: 'partial',   label: 'הוזמן חלקית' },
  { value: 'booked',    label: 'הוזמן מלא' },
  { value: 'completed', label: 'הסתיים' },
];

const STATUS_COLOR: Record<TripStatus, string> = {
  planning:  'bg-yellow-100 text-yellow-700',
  partial:   'bg-orange-100 text-orange-700',
  booked:    'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-500',
};

const EMOJIS = ['✈️','🌍','🏖️','🏔️','🗺️','🌴','🏛️','🗽','🎡','🚢','🏕️','🌊','🇮🇱','🇮🇹','🇫🇷','🇯🇵','🇺🇸','🇬🇧','🇪🇸','🇬🇷'];

function nightsCount(start: string, end: string): number | null {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

const TripOverview: React.FC<Props> = ({ trip, onTripUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState(trip.name);
  const [coverEmoji, setCoverEmoji] = useState(trip.coverEmoji);
  const [countries, setCountries] = useState(trip.countries.join(', '));
  const [cities, setCities] = useState(trip.cities.join(', '));
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [travelers, setTravelers] = useState(String(trip.travelers));
  const [travelerNames, setTravelerNames] = useState(trip.travelerNames.join(', '));
  const [status, setStatus] = useState<TripStatus>(trip.status);
  const [notes, setNotes] = useState(trip.notes);

  const openEdit = () => {
    setName(trip.name);
    setCoverEmoji(trip.coverEmoji);
    setCountries(trip.countries.join(', '));
    setCities(trip.cities.join(', '));
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setTravelers(String(trip.travelers));
    setTravelerNames(trip.travelerNames.join(', '));
    setStatus(trip.status);
    setNotes(trip.notes);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data: Partial<Trip> = {
        name: name.trim(),
        coverEmoji,
        countries: countries.split(',').map(s => s.trim()).filter(Boolean),
        cities: cities.split(',').map(s => s.trim()).filter(Boolean),
        startDate,
        endDate,
        travelers: parseInt(travelers) || 1,
        travelerNames: travelerNames.split(',').map(s => s.trim()).filter(Boolean),
        status,
        notes,
      };
      await updateTrip(trip.id, data);
      onTripUpdated({ ...trip, ...data });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const nights = nightsCount(trip.startDate, trip.endDate);

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700">עריכת פרטי הטיול</span>
        </div>

        {/* Emoji picker */}
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setCoverEmoji(e)}
              className={`text-xl w-10 h-10 rounded-xl border transition-all ${coverEmoji === e ? 'border-blue-500 bg-blue-50 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2"
            placeholder="שם הטיול"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
            placeholder="מדינות (מופרד בפסיק)"
            value={countries}
            onChange={e => setCountries(e.target.value)}
          />
          <input
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
            placeholder="ערים (מופרד בפסיק)"
            value={cities}
            onChange={e => setCities(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">תאריך יציאה</label>
            <input
              type="date"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">תאריך חזרה</label>
            <input
              type="date"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <input
            type="number"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
            placeholder="מספר נוסעים"
            value={travelers}
            onChange={e => setTravelers(e.target.value)}
            min="1"
          />
          <input
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
            placeholder="שמות נוסעים (מופרד בפסיק)"
            value={travelerNames}
            onChange={e => setTravelerNames(e.target.value)}
          />
        </div>

        {/* Status selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">סטטוס</label>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                  status === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full resize-none"
          rows={3}
          placeholder="הערות (אופציונלי)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Check className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{trip.coverEmoji}</span>
            <div>
              <h2 className="font-black text-slate-800 text-xl">{trip.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLOR[trip.status]}`}>
                {STATUS_OPTIONS.find(o => o.value === trip.status)?.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openEdit}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trip.countries.length > 0 && (
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">מדינות</p>
                <p className="text-sm text-slate-700 font-medium">{trip.countries.join(', ')}</p>
              </div>
            </div>
          )}
          {trip.cities.length > 0 && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">ערים</p>
                <p className="text-sm text-slate-700 font-medium">{trip.cities.join(', ')}</p>
              </div>
            </div>
          )}
          {(trip.startDate || trip.endDate) && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">תאריכים</p>
                <p className="text-sm text-slate-700 font-medium">
                  {fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}
                  {nights && <span className="text-slate-400 text-xs mr-1">({nights} לילות)</span>}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">נוסעים</p>
              <p className="text-sm text-slate-700 font-medium">
                {trip.travelers} נוסעים
                {trip.travelerNames.length > 0 && (
                  <span className="text-slate-500 text-xs mr-1">({trip.travelerNames.join(', ')})</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {trip.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">הערות</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{trip.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripOverview;

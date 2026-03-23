import React, { useState, useEffect } from 'react';
import type { Trip, TripFlight, TripAccommodation } from '../types';
import { subscribeFlights, subscribeHotels } from '../services/tripService';
import { Plane, Moon, AlertCircle } from 'lucide-react';

interface Props { trip: Trip }

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : ''; }

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur < last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function hotelForNight(date: string, hotels: TripAccommodation[]): TripAccommodation | null {
  return hotels.find(h => h.checkIn <= date && date < h.checkOut) ?? null;
}

const TripTimeline: React.FC<Props> = ({ trip }) => {
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [hotels,  setHotels]  = useState<TripAccommodation[]>([]);

  useEffect(() => subscribeFlights(trip.id, setFlights), [trip.id]);
  useEffect(() => subscribeHotels(trip.id,  setHotels),  [trip.id]);

  // First outbound + last return — deduplicated across travelers
  const outbound = [...flights]
    .filter(f => f.direction === 'outbound')
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate))[0];

  const returnFlight = [...flights]
    .filter(f => f.direction === 'return')
    .sort((a, b) => b.departureDate.localeCompare(a.departureDate))[0];

  const startDate = outbound?.departureDate || trip.startDate;
  const endDate   = returnFlight?.departureDate || trip.endDate;

  const days = startDate && endDate ? datesInRange(startDate, endDate) : [];

  const mapsUrl = (() => {
    const locs: string[] = [];
    if (outbound?.arrivalAirport) locs.push(outbound.arrivalAirport + ' airport');
    for (const h of [...hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn)))
      locs.push(h.address ? h.address : h.name);
    if (returnFlight?.departureAirport && returnFlight.departureAirport !== outbound?.arrivalAirport)
      locs.push(returnFlight.departureAirport + ' airport');
    return locs.length > 0
      ? `https://www.google.com/maps/dir/${locs.map(encodeURIComponent).join('/')}`
      : '';
  })();

  if (!startDate && !endDate && hotels.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <span className="text-5xl opacity-20">🗺</span>
        <p className="font-semibold">הוסף טיסות ולינות כדי לראות את המסלול</p>
      </div>
    );
  }

  // Group consecutive days by hotel to render hotel blocks
  type DayGroup = { hotel: TripAccommodation | null; days: string[] };
  const groups: DayGroup[] = [];
  for (const date of days) {
    const hotel = hotelForNight(date, hotels);
    const last = groups[groups.length - 1];
    if (last && last.hotel?.id === hotel?.id) {
      last.days.push(date);
    } else {
      groups.push({ hotel, days: [date] });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-black text-slate-800 text-lg">מסלול הטיול</h2>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all">
            🗺 פתח במפה
          </a>
        )}
      </div>

      {/* Departure flight */}
      {outbound && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-2xl shadow-sm">
          <Plane className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">✈ יציאה — {fmtDate(outbound.departureDate)}</p>
            <p className="text-blue-200 text-xs">
              {outbound.departureAirport} → {outbound.arrivalAirport}
              {outbound.departureTime && ` · ${outbound.departureTime}`}
              {outbound.flightNumber && ` · ${outbound.flightNumber}`}
            </p>
          </div>
        </div>
      )}

      {/* Daily schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {groups.map((group, gi) => {
          const hotel = group.hotel;
          const firstDay = group.days[0];
          const lastDay  = group.days[group.days.length - 1];
          const nights   = group.days.length;
          const mapsLink = hotel
            ? (hotel.address
                ? `https://www.google.com/maps/search/${encodeURIComponent(hotel.address)}`
                : `https://www.google.com/maps/search/${encodeURIComponent(hotel.name)}`)
            : null;

          return (
            <div key={gi} className={`border-b border-slate-100 last:border-0 ${hotel ? '' : 'bg-amber-50/50'}`}>
              {/* Hotel header row */}
              <div className={`flex items-center gap-3 px-4 py-3 ${hotel ? 'bg-slate-50 border-b border-slate-100' : ''}`}>
                <Moon className={`w-4 h-4 flex-shrink-0 ${hotel ? 'text-indigo-400' : 'text-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  {hotel ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{hotel.name}</span>
                      {hotel.address && (
                        <span className="text-xs text-slate-400 truncate">{hotel.address}</span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> לא הוגדרה לינה
                    </span>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(firstDay)}
                    {nights > 1 && ` – ${fmtDate(lastDay)} · ${nights} לילות`}
                    {nights === 1 && ' · לילה אחד'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hotel?.price > 0 && (
                    <span className="text-xs font-bold text-slate-600">{hotel.price.toLocaleString()} {hotel.currency}</span>
                  )}
                  {mapsLink && (
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                      🗺
                    </a>
                  )}
                  {hotel?.bookingUrl && (
                    <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                      הזמנה →
                    </a>
                  )}
                </div>
              </div>

              {/* Individual days */}
              {group.days.map(date => {
                const d = new Date(date + 'T12:00:00');
                const dayName = HE_DAYS[d.getDay()];
                const isCheckIn  = hotel && hotel.checkIn  === date;
                const isCheckOut = hotel && hotel.checkOut === date;
                return (
                  <div key={date} className="flex items-center gap-3 px-4 py-2">
                    <div className="w-14 flex-shrink-0 text-right">
                      <span className="text-xs font-bold text-slate-600">{fmtDate(date).slice(0, 5)}</span>
                      <span className="text-[10px] text-slate-400 block">יום {dayName}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100 flex-shrink-0" />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {hotel ? (
                        <>
                          <span className="text-indigo-400">🌙</span>
                          <span>{hotel.name}</span>
                          {isCheckIn  && <span className="text-green-600 font-bold text-[10px] bg-green-50 px-1.5 py-0.5 rounded-full">צ'ק-אין</span>}
                        </>
                      ) : (
                        <span className="text-amber-500">⚠ לא הוגדרה לינה</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {days.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            הוסף טיסות עם תאריכים כדי לראות את לוז הימים
          </div>
        )}
      </div>

      {/* Return flight */}
      {returnFlight && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
          <Plane className="w-5 h-5 flex-shrink-0 rotate-180" />
          <div className="flex-1">
            <p className="font-bold text-sm">✈ חזור — {fmtDate(returnFlight.departureDate)}</p>
            <p className="text-emerald-200 text-xs">
              {returnFlight.departureAirport} → {returnFlight.arrivalAirport}
              {returnFlight.departureTime && ` · ${returnFlight.departureTime}`}
              {returnFlight.flightNumber && ` · ${returnFlight.flightNumber}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripTimeline;

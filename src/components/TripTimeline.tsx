import React, { useState, useEffect } from 'react';
import type { Trip, TripFlight, TripAccommodation } from '../types';
import { subscribeFlights, subscribeHotels } from '../services/tripService';
import { Plane, Building2, Map, ArrowLeft } from 'lucide-react';

interface Props {
  trip: Trip;
}

type TimelineItem =
  | { kind: 'flight'; date: string; data: TripFlight }
  | { kind: 'hotel';  date: string; data: TripAccommodation };

function fmtDate(d: string) { return d ? d.split('-').reverse().join('/') : ''; }

function buildMapsRoute(flights: TripFlight[], hotels: TripAccommodation[]): string {
  // Collect ordered waypoints: airports from flights + hotel addresses/names
  const items: { date: string; location: string }[] = [];

  for (const f of flights) {
    if (f.departureAirport && f.departureDate)
      items.push({ date: f.departureDate + (f.departureTime ?? ''), location: f.departureAirport + ' airport' });
    if (f.arrivalAirport && f.arrivalDate)
      items.push({ date: f.arrivalDate + (f.arrivalTime ?? ''), location: f.arrivalAirport + ' airport' });
  }

  for (const h of hotels) {
    if (h.checkIn)
      items.push({ date: h.checkIn, location: h.address || h.name });
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  const unique = items.reduce<string[]>((acc, cur) => {
    if (!acc.includes(cur.location)) acc.push(cur.location);
    return acc;
  }, []);

  if (unique.length < 2) return '';
  return `https://www.google.com/maps/dir/${unique.map(encodeURIComponent).join('/')}`;
}

const TripTimeline: React.FC<Props> = ({ trip }) => {
  const [flights, setFlights] = useState<TripFlight[]>([]);
  const [hotels,  setHotels]  = useState<TripAccommodation[]>([]);

  useEffect(() => subscribeFlights(trip.id, setFlights), [trip.id]);
  useEffect(() => subscribeHotels(trip.id,  setHotels),  [trip.id]);

  // Build sorted timeline items
  const items: TimelineItem[] = [
    ...flights.map(f => ({ kind: 'flight' as const, date: f.departureDate + (f.departureTime ?? ''), data: f })),
    ...hotels.map(h  => ({ kind: 'hotel'  as const, date: h.checkIn,                                data: h })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const mapsUrl = buildMapsRoute(flights, hotels);

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Map className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-semibold">אין נתונים לתצוגת מסלול</p>
        <p className="text-sm mt-1">הוסף טיסות ולינות כדי לראות את המסלול כאן</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">מסלול הטיול</h2>
          <p className="text-slate-500 text-sm">{items.length} עצירות · לפי סדר כרונולוגי</p>
        </div>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-sm shadow-blue-200"
          >
            <Map className="w-4 h-4" /> מפה מלאה
          </a>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute right-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-slate-100" />

        <div className="space-y-3">
          {items.map((item) => {
            if (item.kind === 'flight') {
              const f = item.data;
              return (
                <div key={`flight-${f.id}`} className="flex gap-4 items-start">
                  {/* Icon */}
                  <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    f.direction === 'outbound' ? 'bg-blue-600' : f.direction === 'return' ? 'bg-emerald-600' : 'bg-purple-600'
                  }`}>
                    <Plane className="w-4 h-4 text-white" />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-medium mb-0.5">
                          {f.direction === 'outbound' ? 'טיסה הלוך' : f.direction === 'return' ? 'טיסה חזור' : 'טיסה פנימית'}
                          {f.departureDate && ` · ${fmtDate(f.departureDate)}`}
                          {f.departureTime && ` ${f.departureTime}`}
                        </p>
                        <p className="font-bold text-slate-800 text-sm">
                          {f.airline}{f.flightNumber && ` ${f.flightNumber}`}
                        </p>
                        {(f.departureAirport || f.arrivalAirport) && (
                          <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-2">
                            <span className="font-semibold">{f.departureAirport}</span>
                            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 rotate-180" />
                            <span className="font-semibold">{f.arrivalAirport}</span>
                            {f.arrivalTime && <span className="text-xs text-slate-400">→ {f.arrivalTime}</span>}
                          </p>
                        )}
                      </div>
                      {f.price > 0 && (
                        <span className="text-sm font-bold text-slate-600 flex-shrink-0">{f.price.toLocaleString()} {f.currency}</span>
                      )}
                    </div>
                    {f.bookingRef && (
                      <p className="text-xs text-slate-400 mt-1">קוד: <span className="font-mono font-semibold text-slate-600">{f.bookingRef}</span></p>
                    )}
                  </div>
                </div>
              );
            } else {
              const h = item.data;
              const nights = (() => {
                if (!h.checkIn || !h.checkOut) return null;
                const d = Math.round((new Date(h.checkOut).getTime() - new Date(h.checkIn).getTime()) / 86400000);
                return d > 0 ? d : null;
              })();
              const mapsLink = h.address
                ? `https://www.google.com/maps/search/${encodeURIComponent(h.address)}`
                : `https://www.google.com/maps/search/${encodeURIComponent(h.name)}`;

              return (
                <div key={`hotel-${h.id}`} className="flex gap-4 items-start">
                  {/* Icon */}
                  <div className="relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-500 shadow-sm">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-medium mb-0.5">
                          לינה · {fmtDate(h.checkIn)} → {fmtDate(h.checkOut)}
                          {nights && ` · ${nights} לילות`}
                        </p>
                        <p className="font-bold text-slate-800 text-sm">{h.name}</p>
                        {h.address && <p className="text-xs text-slate-500 mt-0.5 truncate">{h.address}</p>}
                      </div>
                      {h.price > 0 && (
                        <span className="text-sm font-bold text-slate-600 flex-shrink-0">{h.price.toLocaleString()} {h.currency}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                        <Map className="w-3 h-3" /> פתח במפה
                      </a>
                      {h.bookingUrl && (
                        <a href={h.bookingUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                          קישור הזמנה →
                        </a>
                      )}
                      {h.paid && <span className="text-xs text-green-600 font-bold">✓ שולם</span>}
                    </div>
                  </div>
                </div>
              );
            }
          })}

          {/* End marker */}
          <div className="flex gap-4 items-center">
            <div className="relative z-10 w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">סוף הטיול</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripTimeline;

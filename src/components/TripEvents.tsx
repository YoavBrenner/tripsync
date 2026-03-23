import React, { useState, useEffect, useCallback } from 'react';
import type { Trip } from '../types';
import type { EventItem } from '../../api/events';

interface Props { trip: Trip }

type Tab = 'events' | 'football' | 'casino';

const TABS: { key: Tab; label: string; focus: string; emoji: string }[] = [
  { key: 'events',   label: 'אירועים',    focus: 'general', emoji: '🎟' },
  { key: 'football', label: 'כדורגל',     focus: 'football', emoji: '⚽' },
  { key: 'casino',   label: 'קזינו ופוקר', focus: 'casino',  emoji: '🃏' },
];

const GENRE_COLOR: Record<string, string> = {
  Rock:              'bg-red-100 text-red-700',
  Pop:               'bg-pink-100 text-pink-700',
  Jazz:              'bg-yellow-100 text-yellow-700',
  Classical:         'bg-purple-100 text-purple-700',
  Football:          'bg-green-100 text-green-700',
  Basketball:        'bg-orange-100 text-orange-700',
  Festival:          'bg-indigo-100 text-indigo-700',
  Theatre:           'bg-teal-100 text-teal-700',
  Comedy:            'bg-lime-100 text-lime-700',
  Casino:            'bg-emerald-100 text-emerald-700',
  'Poker Tournament':'bg-emerald-100 text-emerald-800',
};

function genreColor(genre: string): string {
  return GENRE_COLOR[genre] ?? 'bg-slate-100 text-slate-600';
}

function fmtDateHe(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const [, mm, dd] = dateStr.split('-');
  const datePart = `${dd}/${mm}`;
  return timeStr ? `${datePart} ${timeStr}` : datePart;
}

function fmtDateHeader(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

const HE_TO_EN: Record<string, string> = {
  'אוסטריה': 'Austria', 'וינה': 'Vienna', 'זלצבורג': 'Salzburg',
  'גרמניה': 'Germany', 'ברלין': 'Berlin', 'מינכן': 'Munich', 'המבורג': 'Hamburg',
  'צרפת': 'France', 'פריז': 'Paris', 'ניס': 'Nice', 'ליון': 'Lyon',
  'איטליה': 'Italy', 'רומא': 'Rome', 'מילאנו': 'Milan', 'פירנצה': 'Florence', 'ונציה': 'Venice',
  'ספרד': 'Spain', 'מדריד': 'Madrid', 'ברצלונה': 'Barcelona',
  'הולנד': 'Netherlands', 'אמסטרדם': 'Amsterdam',
  'בלגיה': 'Belgium', 'בריסל': 'Brussels',
  'שוויץ': 'Switzerland', 'ציריך': 'Zurich', "ז'נווה": 'Geneva',
  'פורטוגל': 'Portugal', 'ליסבון': 'Lisbon', 'פורטו': 'Porto',
  'יוון': 'Greece', 'אתונה': 'Athens', 'תסלוניקי': 'Thessaloniki',
  'פולין': 'Poland', 'קרקוב': 'Krakow', 'ורשה': 'Warsaw',
  "צ'כיה": 'Czech Republic', 'פראג': 'Prague',
  'הונגריה': 'Hungary', 'בודפשט': 'Budapest',
  'קרואטיה': 'Croatia', 'זגרב': 'Zagreb', 'דוברובניק': 'Dubrovnik',
  'אנגליה': 'England', 'לונדון': 'London', "מנצ'סטר": 'Manchester',
  "ארה'ב": 'United States', 'ניו יורק': 'New York', "לוס אנג'לס": 'Los Angeles',
  'תאילנד': 'Thailand', 'בנגקוק': 'Bangkok',
  'יפן': 'Japan', 'טוקיו': 'Tokyo', 'קיוטו': 'Kyoto',
};

function toEnglish(name: string): string {
  return HE_TO_EN[name.trim()] ?? name.trim();
}

const CASINOS_AT_CITIES: Record<string, string> = {
  salzburg: 'salzburg', wien: 'wien', vienna: 'wien', innsbruck: 'innsbruck',
  linz: 'linz', graz: 'graz', bregenz: 'bregenz', 'kitzbühel': 'kitzbuehel',
  kitzbuehel: 'kitzbuehel', kitzbuhel: 'kitzbuehel', kitzbuel: 'kitzbuehel',
  baden: 'baden', 'bad gastein': 'badgastein', velden: 'velden', seefeld: 'seefeld',
};

function casinoUrl(city: string): string {
  const slug = city.toLowerCase().trim();
  if (CASINOS_AT_CITIES[slug]) {
    return `https://www.casinos.at/en/casinos/${CASINOS_AT_CITIES[slug]}`;
  }
  return `https://www.google.com/search?q=casino+${encodeURIComponent(city)}`;
}

function cacheKey(tripId: string, tab: Tab) { return `trip_${tab}_${tripId}`; }
function sessionKey(tripId: string, tab: Tab) { return `fetched_${tab}_${tripId}`; }

function loadCache(tripId: string, tab: Tab): EventItem[] {
  try { return JSON.parse(localStorage.getItem(cacheKey(tripId, tab)) ?? '[]') as EventItem[]; }
  catch { return []; }
}

function mergeEvents(existing: EventItem[], incoming: EventItem[]): EventItem[] {
  const seen = new Map(existing.map(e => [e.id, e]));
  for (const ev of incoming) seen.set(ev.id, ev);
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function groupByDate(items: EventItem[]) {
  const groups: { date: string; items: EventItem[] }[] = [];
  for (const ev of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === ev.date) last.items.push(ev);
    else groups.push({ date: ev.date, items: [ev] });
  }
  return groups;
}

// ── Single-tab panel ──────────────────────────────────────────────
const TabPanel: React.FC<{
  tab: Tab;
  trip: Trip;
  searchTargets: string[];
}> = ({ tab, trip, searchTargets }) => {
  const tabCfg = TABS.find(t => t.key === tab)!;

  const [events, setEvents] = useState<EventItem[]>(() => loadCache(trip.id, tab));
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [noKey, setNoKey]   = useState(false);
  const [cityInput, setCityInput] = useState('');

  const fetchForCity = useCallback(async (city: string): Promise<EventItem[]> => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, startDate: trip.startDate, endDate: trip.endDate, focus: tabCfg.focus }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { events?: EventItem[]; error?: string };
    if (data.error === 'NO_KEY') throw new Error('NO_KEY');
    return data.events ?? [];
  }, [trip.startDate, trip.endDate, tabCfg.focus]);

  const runFetch = useCallback(async (targets: string[]) => {
    if (targets.length === 0) return;
    setLoading(true); setError(''); setNoKey(false);
    try {
      const results = await Promise.all(targets.map(c => fetchForCity(c)));
      setEvents(prev => {
        const merged = mergeEvents(prev, results.flat());
        localStorage.setItem(cacheKey(trip.id, tab), JSON.stringify(merged));
        return merged;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה';
      if (msg === 'NO_KEY') setNoKey(true); else setError(msg);
    } finally { setLoading(false); }
  }, [fetchForCity, trip.id, tab]);

  // Auto-fetch once per session
  useEffect(() => {
    if (searchTargets.length === 0 || !trip.startDate || !trip.endDate) return;
    if (sessionStorage.getItem(sessionKey(trip.id, tab))) return;
    sessionStorage.setItem(sessionKey(trip.id, tab), '1');
    void runFetch(searchTargets);
  }, []); // eslint-disable-line

  const handleCitySearch = () => {
    const city = toEnglish(cityInput.trim());
    if (city) { setCityInput(''); void runFetch([city]); }
  };

  const grouped = groupByDate(events);

  if (noKey) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
      <p className="font-bold text-amber-800 text-sm">חסר ANTHROPIC_API_KEY</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search row */}
      <div className="flex gap-2">
        <input
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 flex-1 placeholder:text-slate-400"
          placeholder="עיר נוספת..."
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
          dir="ltr"
        />
        <button type="button" onClick={handleCitySearch} disabled={!cityInput.trim() || loading}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all">
          חפש
        </button>
        <button type="button" onClick={() => void runFetch(searchTargets)} disabled={loading || searchTargets.length === 0}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 rounded-xl text-sm font-bold transition-all">
          🔄
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          שגיאה: {error}
          <button type="button" onClick={() => { setError(''); void runFetch(searchTargets); }}
            className="mr-2 underline">נסה שוב</button>
        </div>
      )}

      {/* Status */}
      <p className="text-slate-500 text-sm">
        {loading ? `מחפש ${tabCfg.label}...` : events.length > 0 ? `${events.length} תוצאות` : searchTargets.length > 0 ? `ב: ${searchTargets.join(', ')}` : 'הגדר יעד בטיול'}
      </p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="mr-3 text-slate-500 text-sm">טוען...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2 opacity-40">{tabCfg.emoji}</div>
          <p className="font-medium text-sm">לא נמצאו תוצאות</p>
        </div>
      )}

      {/* Results grouped by date */}
      {!loading && grouped.length > 0 && (
        <div className="space-y-5">
          {grouped.map(group => (
            <div key={group.date}>
              {group.date && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-bold text-slate-500 px-2 whitespace-nowrap">
                    {fmtDateHeader(group.date)}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              )}
              <div className="space-y-2">
                {group.items.map(ev => (
                  <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-xl">
                        {tab === 'football' ? '⚽' : tab === 'casino' ? '🃏' : '🎟'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-snug mb-1">{ev.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {ev.date && <span className="text-xs text-slate-500">📅 {fmtDateHe(ev.date, ev.time)}</span>}
                          {ev.venue && <span className="text-xs text-slate-400 truncate max-w-[160px]">📍 {ev.venue}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {ev.genre && ev.genre !== 'Undefined' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${genreColor(ev.genre)}`}>
                              {ev.genre}
                            </span>
                          )}
                          {tab === 'football' ? (
                            <a
                              href={`https://www.stubhub.com/search?q=${encodeURIComponent(ev.name)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition-all">
                              🎟 StubHub
                            </a>
                          ) : tab === 'casino' ? (
                            <a
                              href={casinoUrl(ev.city || ev.venue || '')}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition-all">
                              אתר →
                            </a>
                          ) : ev.url ? (
                            <a href={ev.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition-all">
                              כרטיסים →
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────
const TripEvents: React.FC<Props> = ({ trip }) => {
  const [activeTab, setActiveTab] = useState<Tab>('events');

  const searchTargets = (() => {
    const sources = trip.cities.length > 0 ? trip.cities : trip.countries;
    return [...new Set(sources.map(toEnglish))];
  })();

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <TabPanel key={activeTab} tab={activeTab} trip={trip} searchTargets={searchTargets} />
    </div>
  );
};

export default TripEvents;

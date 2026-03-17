import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Trip } from '../types';
import { ChevronRight } from 'lucide-react';
import TripOverview from './TripOverview';
import TripFlights from './TripFlights';
import TripHotels from './TripHotels';
import TripBudget from './TripBudget';
import TripLinks from './TripLinks';
import TripTimeline from './TripTimeline';

interface Props {
  trip: Trip;
  user: User;
  onBack: () => void;
  onTripUpdated: (t: Trip) => void;
}

type Tab = 'timeline' | 'overview' | 'flights' | 'hotels' | 'budget' | 'links';

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: '🗺 מסלול' },
  { key: 'overview', label: 'סקירה' },
  { key: 'flights',  label: '✈ טיסות' },
  { key: 'hotels',   label: '🏨 לינה' },
  { key: 'budget',   label: '💰 הוצאות' },
  { key: 'links',    label: 'קישורים' },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  planning:  { label: 'בתכנון',       color: 'bg-yellow-100 text-yellow-700' },
  partial:   { label: 'הוזמן חלקית',  color: 'bg-orange-100 text-orange-700' },
  booked:    { label: 'הוזמן מלא',    color: 'bg-green-100 text-green-700'   },
  completed: { label: 'הסתיים',       color: 'bg-slate-100 text-slate-500'   },
};

const TripDetail: React.FC<Props> = ({ trip, user: _user, onBack, onTripUpdated }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const status = STATUS_LABEL[trip.status] ?? STATUS_LABEL.planning;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{trip.coverEmoji}</span>
            <h1 className="font-black text-slate-800 text-xl leading-tight truncate">{trip.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.color}`}>
              {status.label}
            </span>
          </div>
          {trip.countries.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5 truncate">{trip.countries.join(' · ')}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 min-w-max bg-slate-100 rounded-2xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'timeline' && <TripTimeline trip={trip} />}
        {activeTab === 'overview' && <TripOverview trip={trip} onTripUpdated={onTripUpdated} />}
        {activeTab === 'flights'  && <TripFlights  tripId={trip.id} />}
        {activeTab === 'hotels'   && <TripHotels   tripId={trip.id} />}
        {activeTab === 'budget'   && <TripBudget   tripId={trip.id} />}
        {activeTab === 'links'    && <TripLinks    tripId={trip.id} />}
      </div>
    </div>
  );
};

export default TripDetail;

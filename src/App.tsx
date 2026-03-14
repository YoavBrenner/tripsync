import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import TripsList from './components/TripsList';
import TripDetail from './components/TripDetail';
import { Trip } from './types';
import { Plane, LogOut, LogIn } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const signIn = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 gap-6 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">TripSync</h1>
            <p className="text-slate-500 text-sm">ניהול טיולים משפחתיים</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center space-y-4">
          <p className="text-slate-600 text-sm">כנסו עם Google כדי להתחיל</p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow"
          >
            <LogIn className="w-5 h-5" />
            כניסה עם Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSelectedTrip(null)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-800 text-lg">TripSync</span>
          </button>
          <div className="flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-slate-200" />}
            <span className="text-sm text-slate-600 hidden sm:block">{user.displayName}</span>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {selectedTrip ? (
          <TripDetail
            trip={selectedTrip}
            user={user}
            onBack={() => setSelectedTrip(null)}
            onTripUpdated={setSelectedTrip}
          />
        ) : (
          <TripsList user={user} onSelectTrip={setSelectedTrip} />
        )}
      </main>
    </div>
  );
};

export default App;

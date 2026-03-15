import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, TripFlight, TripAccommodation, TripPayment, TripLink } from '../types';

// ── Trips ──────────────────────────────────────────────────────────────────

export function subscribeTrips(uid: string, cb: (trips: Trip[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'trips'),
    where('members', 'array-contains', uid),
  );
  return onSnapshot(q, snap => {
    const trips = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Trip))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    cb(trips);
  }, (err) => { console.error('subscribeTrips error:', err); cb([]); });
}

export async function createTrip(trip: Omit<Trip, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'trips'), trip);
  return ref.id;
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<void> {
  await updateDoc(doc(db, 'trips', id), data);
}

export async function deleteTrip(id: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', id));
}

// ── Generic sub-collection helpers ────────────────────────────────────────

function subCol(tripId: string, name: string) {
  return collection(db, 'trips', tripId, name);
}
function subDoc(tripId: string, name: string, itemId: string) {
  return doc(db, 'trips', tripId, name, itemId);
}

export function subscribeSubCollection<T extends { id: string }>(
  tripId: string,
  name: string,
  cb: (items: T[]) => void,
): Unsubscribe {
  return onSnapshot(subCol(tripId, name), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)));
  }, () => cb([]));
}

export async function addSubItem<T extends object>(tripId: string, name: string, item: T): Promise<string> {
  const ref = await addDoc(subCol(tripId, name), item);
  return ref.id;
}

export async function updateSubItem<T extends object>(tripId: string, name: string, itemId: string, data: Partial<T>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(subDoc(tripId, name, itemId), data as any);
}

export async function deleteSubItem(tripId: string, name: string, itemId: string): Promise<void> {
  await deleteDoc(subDoc(tripId, name, itemId));
}

// ── Typed helpers ─────────────────────────────────────────────────────────

export const subscribeFlights   = (id: string, cb: (x: TripFlight[]) => void)        => subscribeSubCollection<TripFlight>(id, 'flights', cb);
export const subscribeHotels    = (id: string, cb: (x: TripAccommodation[]) => void)  => subscribeSubCollection<TripAccommodation>(id, 'accommodations', cb);
export const subscribePayments  = (id: string, cb: (x: TripPayment[]) => void)        => subscribeSubCollection<TripPayment>(id, 'payments', cb);
export const subscribeLinks     = (id: string, cb: (x: TripLink[]) => void)           => subscribeSubCollection<TripLink>(id, 'links', cb);

export const addFlight     = (id: string, x: Omit<TripFlight, 'id'>)        => addSubItem(id, 'flights', x);
export const addHotel      = (id: string, x: Omit<TripAccommodation, 'id'>) => addSubItem(id, 'accommodations', x);
export const addPayment    = (id: string, x: Omit<TripPayment, 'id'>)       => addSubItem(id, 'payments', x);
export const addLink       = (id: string, x: Omit<TripLink, 'id'>)          => addSubItem(id, 'links', x);

export const deleteFlight    = (tid: string, id: string) => deleteSubItem(tid, 'flights', id);
export const deleteHotel     = (tid: string, id: string) => deleteSubItem(tid, 'accommodations', id);
export const deletePayment   = (tid: string, id: string) => deleteSubItem(tid, 'payments', id);
export const deleteLink      = (tid: string, id: string) => deleteSubItem(tid, 'links', id);

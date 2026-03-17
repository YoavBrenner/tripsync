export type TripStatus = 'planning' | 'partial' | 'booked' | 'completed';

export interface Trip {
  id: string;
  name: string;
  countries: string[];
  cities: string[];
  startDate: string;
  endDate: string;
  travelers: number;
  travelerNames: string[];
  status: TripStatus;
  notes: string;
  coverEmoji: string;
  ownerId: string;
  collaborators: string[]; // uids
  createdAt: number;
}

export type FlightDirection = 'outbound' | 'return' | 'internal';

export interface TripFlight {
  id: string;
  direction: FlightDirection;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  bookingRef: string;
  bookingUrl: string;
  price: number;
  currency: string;
  luggageKg: number;
  notes: string;
  screenshot?: string; // base64 compressed image
}

export type AccommodationType = 'hotel' | 'airbnb' | 'hostel' | 'other';

export interface TripAccommodation {
  id: string;
  name: string;
  type: AccommodationType;
  address: string;
  checkIn: string;
  checkOut: string;
  bookingUrl: string;
  confirmationNumber: string;
  price: number;
  currency: string;
  paid: boolean;
  notes: string;
  screenshot?: string; // base64 compressed image
}

export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type PaymentCategory = 'flight' | 'hotel' | 'car' | 'insurance' | 'activities' | 'food' | 'other';

export interface TripPayment {
  id: string;
  category: PaymentCategory;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  notes: string;
}

export type LinkCategory = 'booking' | 'map' | 'attraction' | 'transport' | 'document' | 'other';

export interface TripLink {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
  notes: string;
}

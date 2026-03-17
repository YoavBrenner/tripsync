// ── Email / booking confirmation parser ──────────────────────────────────

export interface ParsedFlight {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureDate?: string;   // YYYY-MM-DD
  departureTime?: string;   // HH:MM
  arrivalDate?: string;
  arrivalTime?: string;
  bookingRef?: string;
  price?: number;
  currency?: string;
}

export interface ParsedHotel {
  name?: string;
  checkIn?: string;         // YYYY-MM-DD
  checkOut?: string;
  confirmationNumber?: string;
  address?: string;
  price?: number;
  currency?: string;
}

const AIRLINE_CODES: Record<string, string> = {
  LY: 'El Al', FR: 'Ryanair', W6: 'Wizz Air', VY: 'Vueling',
  IB: 'Iberia', AF: 'Air France', LH: 'Lufthansa', BA: 'British Airways',
  TK: 'Turkish Airlines', U2: 'EasyJet', TP: 'TAP', DY: 'Norwegian',
  PC: 'Pegasus', EK: 'Emirates', QR: 'Qatar Airways', LX: 'Swiss',
  OS: 'Austrian', AZ: 'ITA Airways', KL: 'KLM', SN: 'Brussels Airlines',
};

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

export function parseEmailDate(text: string): string | undefined {
  // DD/MM/YYYY
  const m1 = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  // YYYY-MM-DD
  const m2 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  // DD Mon YYYY or D Month YYYY
  const m3 = text.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (m3) {
    const month = MONTH_MAP[m3[2].toLowerCase()];
    if (month) return `${m3[3]}-${month}-${m3[1].padStart(2, '0')}`;
  }
  return undefined;
}

function detectCurrency(text: string): string | undefined {
  if (/₪|ILS/.test(text)) return 'ILS';
  if (/\$|USD/.test(text)) return 'USD';
  if (/€|EUR/.test(text)) return 'EUR';
  if (/£|GBP/.test(text)) return 'GBP';
  return undefined;
}

export function parseFlightEmail(text: string): ParsedFlight {
  const result: ParsedFlight = {};

  // Flight number (e.g. LY001, FR1234, W6 1234)
  const flightMatch = text.match(/\b([A-Z]{2})\s*(\d{1,4})\b/);
  if (flightMatch) {
    result.flightNumber = flightMatch[1] + flightMatch[2];
    if (AIRLINE_CODES[flightMatch[1]]) result.airline = AIRLINE_CODES[flightMatch[1]];
  }

  // Booking reference / PNR
  const refMatch = text.match(
    /(?:booking[\s\w]{0,20}ref[erences]{0,7}|reservation[\s\w]{0,10}|confirmation[\s\w]{0,15}|pnr|order[\s\w]{0,10}num[ber]{0,3}|קוד הזמנה|מספר הזמנה)[\s:#-]*([A-Z0-9]{5,10})/i
  );
  if (refMatch) result.bookingRef = refMatch[1].toUpperCase();

  // Route: TLV → FCO or TLV - FCO or TLV > FCO
  const routeMatch = text.match(/([A-Z]{3})\s*[→\-–>]+\s*([A-Z]{3})/);
  if (routeMatch) {
    result.departureAirport = routeMatch[1];
    result.arrivalAirport = routeMatch[2];
  }
  // "From ... (TLV) to ... (FCO)"
  if (!result.departureAirport) {
    const from = text.match(/(?:from|מ[- ])\s*[^(]*\(([A-Z]{3})\)/i);
    const to   = text.match(/(?:to|ל[- ])\s*[^(]*\(([A-Z]{3})\)/i);
    if (from) result.departureAirport = from[1];
    if (to)   result.arrivalAirport   = to[1];
  }

  // Dates — collect all unique dates in order
  const foundDates: string[] = [];
  const allDateMatches = [
    ...Array.from(text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)).map(m =>
      `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`),
    ...Array.from(text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)).map(m => m[0]),
    ...Array.from(text.matchAll(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/g)).map(m => {
      const mon = MONTH_MAP[m[2].toLowerCase()];
      return mon ? `${m[3]}-${mon}-${m[1].padStart(2,'0')}` : null;
    }).filter(Boolean) as string[],
  ];
  for (const d of allDateMatches) {
    if (!foundDates.includes(d)) foundDates.push(d);
    if (foundDates.length === 2) break;
  }
  if (foundDates[0]) result.departureDate = foundDates[0];
  if (foundDates[1]) result.arrivalDate   = foundDates[1];

  // Times — first two unique times
  const foundTimes: string[] = [];
  for (const m of text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    const t = `${m[1].padStart(2,'0')}:${m[2]}`;
    if (!foundTimes.includes(t)) foundTimes.push(t);
    if (foundTimes.length === 2) break;
  }
  if (foundTimes[0]) result.departureTime = foundTimes[0];
  if (foundTimes[1]) result.arrivalTime   = foundTimes[1];

  // Price
  const priceMatch = text.match(
    /(?:total|price|amount|סה"כ|מחיר|לתשלום)[\s:]*(?:[₪$€£]|ILS|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (priceMatch) {
    result.price    = parseFloat(priceMatch[1].replace(/,/g, ''));
    result.currency = detectCurrency(text) ?? 'ILS';
  }

  return result;
}

export function parseHotelEmail(text: string): ParsedHotel {
  const result: ParsedHotel = {};

  // Hotel name
  const nameMatch = text.match(
    /\b([\w\s'-]{2,40}(?:Hotel|Resort|Inn|Suites?|Hostel|Lodge|Apart(?:ment)?|מלון|אכסניה)[\w\s'-]{0,30})/i
  );
  if (nameMatch) result.name = nameMatch[1].trim();

  // Confirmation number
  const confMatch = text.match(
    /(?:confirmation[\s\w]{0,15}|booking[\s\w]{0,15}num[ber]{0,3}|reservation[\s\w]{0,10}|מספר אישור|מספר הזמנה)[\s:#-]*([A-Z0-9]{5,15})/i
  );
  if (confMatch) result.confirmationNumber = confMatch[1];

  // Check-in date
  const checkinLine = text.match(/(?:check[\s-]?in|arrival|כניסה|הגעה)[\s:]*(.*)/i);
  if (checkinLine) result.checkIn = parseEmailDate(checkinLine[1]);

  const checkoutLine = text.match(/(?:check[\s-]?out|departure|יציאה)[\s:]*(.*)/i);
  if (checkoutLine) result.checkOut = parseEmailDate(checkoutLine[1]);

  // Fallback: first two dates in text
  if (!result.checkIn) {
    const foundDates: string[] = [];
    const allDateMatches = [
      ...Array.from(text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)).map(m =>
        `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`),
      ...Array.from(text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)).map(m => m[0]),
      ...Array.from(text.matchAll(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/g)).map(m => {
        const mon = MONTH_MAP[m[2].toLowerCase()];
        return mon ? `${m[3]}-${mon}-${m[1].padStart(2,'0')}` : null;
      }).filter(Boolean) as string[],
    ];
    for (const d of allDateMatches) {
      if (!foundDates.includes(d)) foundDates.push(d);
      if (foundDates.length === 2) break;
    }
    if (foundDates[0]) result.checkIn  = foundDates[0];
    if (foundDates[1]) result.checkOut = foundDates[1];
  }

  // Address
  const addrMatch = text.match(/(?:address|כתובת)[\s:]*([^\n]{5,100})/i);
  if (addrMatch) result.address = addrMatch[1].trim();

  // Price
  const priceMatch = text.match(
    /(?:total|price|amount|סה"כ|מחיר|לתשלום)[\s:]*(?:[₪$€£]|ILS|USD|EUR|GBP)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (priceMatch) {
    result.price    = parseFloat(priceMatch[1].replace(/,/g, ''));
    result.currency = detectCurrency(text) ?? 'ILS';
  }

  return result;
}

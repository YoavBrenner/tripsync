import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ParsedTicket {
  passengerName: string;
  bookingCode: string;
  flights: ParsedTicketFlight[];
}

export interface ParsedTicketFlight {
  fromAirport: string;
  toAirport: string;
  fromCity: string;
  toCity: string;
  flightNumber: string;
  airline: string;
  departureDate: string;   // YYYY-MM-DD
  departureTime: string;   // HH:MM
  arrivalDate: string;
  arrivalTime: string;
  seat: string;
  baggagePieces: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64 } = req.body as { imageBase64: string };
  if (!imageBase64) return res.status(400).json({ error: 'No image' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel env' });

  // Strip data URL prefix and detect media type
  const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
  const mediaType = (match?.[1] ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const data = match?.[2] ?? imageBase64;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          },
          {
            type: 'text',
            text: `This is a flight ticket or booking confirmation. Extract all information and return ONLY valid JSON (no markdown, no explanation):
{
  "passengerName": "full name as shown",
  "bookingCode": "booking/PNR code",
  "flights": [
    {
      "fromAirport": "IATA code e.g. TLV",
      "toAirport": "IATA code e.g. SZG",
      "fromCity": "city name",
      "toCity": "city name",
      "flightNumber": "e.g. LY5193",
      "airline": "airline name",
      "departureDate": "YYYY-MM-DD",
      "departureTime": "HH:MM",
      "arrivalDate": "YYYY-MM-DD",
      "arrivalTime": "HH:MM",
      "seat": "seat number or empty string",
      "baggagePieces": 1
    }
  ]
}
Return ONLY the JSON object, nothing else.`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: 'Claude API error', detail: err });
  }

  const claude = await response.json() as { content: { type: string; text: string }[] };
  const raw = claude.content?.[0]?.text ?? '{}';

  try {
    // Strip any accidental markdown code fences
    const clean = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed: ParsedTicket = JSON.parse(clean);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: 'Failed to parse Claude response', raw });
  }
}

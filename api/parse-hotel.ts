import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ParsedHotel {
  name: string;
  address: string;
  checkIn: string;    // YYYY-MM-DD
  checkOut: string;   // YYYY-MM-DD
  price: number;
  currency: string;
  confirmationNumber: string;
  bookingUrl: string;
  notes: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text, imageBase64 } = req.body as { text?: string; imageBase64?: string };
  if (!text && !imageBase64) return res.status(400).json({ error: 'No input' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const prompt = `This is a hotel booking confirmation (email or screenshot). Extract all details and return ONLY valid JSON (no markdown):
{
  "name": "hotel or property name",
  "address": "full address including city and country",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "price": 450.00,
  "currency": "USD",
  "confirmationNumber": "booking/confirmation number",
  "bookingUrl": "booking URL if visible, else empty string",
  "notes": "any important notes like breakfast included, free cancellation, etc"
}
For currency use 3-letter ISO code. If price not visible set to 0. Return ONLY the JSON object.`;

  // Build content array — text or image
  const content: object[] = [];

  if (imageBase64) {
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mediaType = match?.[1] ?? 'image/jpeg';
    const data = match?.[2] ?? imageBase64;
    const isPdf = mediaType === 'application/pdf';
    content.push(
      isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
    );
  }

  if (text) {
    content.push({ type: 'text', text: `Booking confirmation text:\n\n${text}` });
  }

  content.push({ type: 'text', text: prompt });

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
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: 'Claude API error', detail: err });
  }

  const claude = await response.json() as { content: { type: string; text: string }[] };
  const raw = claude.content?.[0]?.text ?? '{}';

  try {
    const clean = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    const parsed: ParsedHotel = JSON.parse(clean);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: 'Failed to parse Claude response', raw });
  }
}

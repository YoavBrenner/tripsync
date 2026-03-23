import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface EventItem {
  id: string;
  name: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM or ''
  venue: string;
  city: string;
  genre: string;
  category: string;
  url: string;
  image: string;
}

function fmtMonth(date: string) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { city, startDate, endDate, focus } = req.body as {
    city?: string; startDate?: string; endDate?: string; focus?: string;
  };

  if (!city || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'NO_KEY' });

  const period = fmtMonth(startDate) === fmtMonth(endDate)
    ? fmtMonth(startDate)
    : `${fmtMonth(startDate)} – ${fmtMonth(endDate)}`;

  const jsonSchema = `[
  {
    "id": "unique-slug",
    "name": "Event name in English",
    "date": "YYYY-MM-DD or empty string",
    "time": "HH:MM or empty string",
    "venue": "Venue or location name",
    "city": "${city}",
    "genre": "e.g. Rock, Classical, Football, Festival, Casino, Poker Tournament",
    "category": "Music | Sports | Arts & Theatre | Festival | Casino | Other",
    "url": "Real URL if known, otherwise empty string",
    "image": ""
  }
]`;

  const prompt = focus === 'football'
    ? `List football (soccer) matches likely happening in ${city} during ${period} (${startDate} to ${endDate}). Use your knowledge of league schedules (Bundesliga, Premier League, Serie A, La Liga, Ligue 1, Austrian Bundesliga, etc.) and local teams based in ${city}.

For each match provide:
- Teams playing (Home vs Away)
- Competition/league name
- Stadium in ${city}
- For the url field: provide the official club ticket page URL or a known ticket site (e.g. the home club's official site tickets page, viagogo.com search, or the league's official site). Use real URLs you know exist.

Return ONLY a JSON array (no markdown):
${jsonSchema}
Set genre to "Football" and category to "Sports". Include up to 15 matches. Return ONLY the JSON array.`

    : focus === 'casino'
    ? `List casinos in ${city} that you know about. For each casino include it as an entry. Also list any major poker tournaments (EPT, WPT, national series) known to take place in ${city} during ${period} (${startDate} to ${endDate}) or regularly at these casinos.

For the url field, use the REAL official website of the casino or chain. Follow these known URL patterns:
- Austria: ALWAYS use https://www.casinos.at/en/casinos/{city-slug} — this is the ONLY correct URL for ALL Austrian casinos. Examples: Salzburg → https://www.casinos.at/en/casinos/salzburg, Wien/Vienna → https://www.casinos.at/en/casinos/wien, Innsbruck → https://www.casinos.at/en/casinos/innsbruck, Linz → https://www.casinos.at/en/casinos/linz, Bregenz → https://www.casinos.at/en/casinos/bregenz, Graz → https://www.casinos.at/en/casinos/graz, Kitzbühel → https://www.casinos.at/en/casinos/kitzbuehel, Baden → https://www.casinos.at/en/casinos/baden. Do NOT use salzburg-casino.at or any other domain.
- Monaco: https://www.casinomontecarlo.com
- France (Barrière): https://www.lucienbarriere.com
- UK (Grosvenor): https://www.grosvenorcasinos.com
- UK (Genting): https://www.gentingcasinos.co.uk
- Germany (Spielbank): https://www.spielbank-berlin.de (Berlin), https://www.spielbank-hamburg.de (Hamburg), https://www.spielbank-bayern.de (Bavaria)
- Czech Republic (Casino Admiral): https://www.casino-admiral.cz
- Hungary: https://www.casino-budapest.hu
- Netherlands: https://www.hollandcasino.nl
- Portugal (Estoril): https://www.casino-estoril.pt
- Spain: https://www.casinosespana.es
- Las Vegas / USA: use the official casino hotel website if known
- For any city/casino where you don't know the exact real URL, use: https://www.google.com/search?q=casino+${encodeURIComponent(city)}

Return ONLY a JSON array (no markdown):
${jsonSchema}
Set genre to "Casino" or "Poker Tournament" and category to "Casino". Return ONLY the JSON array.`

    : `List events, concerts, festivals, sports games, and shows likely happening in ${city} during ${period} (${startDate} to ${endDate}). Use your knowledge of recurring annual events, festivals, sports seasons, and cultural events in this city. Include concerts, music festivals, football/soccer matches, cultural festivals, marathons, theater, opera.

Return ONLY a JSON array (no markdown):
${jsonSchema}
Include up to 15 events within ${startDate} to ${endDate}. Return ONLY the JSON array.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[events] Claude API error:', err);
      return res.status(500).json({ error: 'Claude API error', detail: err });
    }

    const claude = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    // Find the final text block (Claude's answer after web search)
    const textBlock = [...(claude.content ?? [])].reverse().find(b => b.type === 'text');
    const raw = textBlock?.text ?? '[]';

    const clean = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

    // Extract JSON array from the response
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) return res.json({ events: [] });

    const events = JSON.parse(match[0]) as EventItem[];
    return res.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch events', detail: message });
  }
}

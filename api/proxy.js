export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'smartphones-handys-2722';
  const condition = searchParams.get('condition') || '';
  const priceMin = searchParams.get('priceMin') || '0';
  const priceMax = searchParams.get('priceMax') || '9999';
  const keyword = searchParams.get('keyword') || '';
  const rows = searchParams.get('rows') || '100';

  let url = `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz/${category}?rows=${rows}&PRICE_FROM=${priceMin}&PRICE_TO=${priceMax}&sort=1`;
  if (condition) url += `&CONDITION=${condition}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `willhaben returned ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      return new Response(JSON.stringify({ error: 'No __NEXT_DATA__ found', listings: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let listings = [];
    try {
      const data = JSON.parse(match[1]);
      const props = data?.props?.pageProps;
      for (const k of ['searchResult', 'advertSummaryList', 'listings']) {
        if (props?.[k]) {
          const r = props[k];
          if (Array.isArray(r)) { listings = r; break; }
          if (r?.advertSummaryList?.advertSummary) { listings = r.advertSummaryList.advertSummary; break; }
          if (r?.advertSummary) { listings = r.advertSummary; break; }
          if (r?.items) { listings = r.items; break; }
        }
      }
    } catch (e) { listings = []; }

    return new Response(JSON.stringify({ listings, count: listings.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, listings: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
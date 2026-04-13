export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'smartphones-handys-2722';
  const condition = searchParams.get('condition') || '';
  const priceMin = searchParams.get('priceMin') || '0';
  const priceMax = searchParams.get('priceMax') || '9999';
  const keyword = searchParams.get('keyword') || '';
  const rows = searchParams.get('rows') || '100';

  // willhaben internal JSON search API (used by their own frontend)
  // Format: /iad/v1.16/user-searches/search?...
  // Fallback to HTML scrape if JSON API fails
  const jsonApiUrl = buildJsonApiUrl(category, condition, priceMin, priceMax, keyword, rows);
  const htmlUrl = buildHtmlUrl(category, condition, priceMin, priceMax, keyword, rows);

  // Try JSON API first
  let result = await tryJsonApi(jsonApiUrl);
  
  // Fallback: HTML scrape
  if (!result || result.length === 0) {
    result = await tryHtmlScrape(htmlUrl);
  }

  if (!result || result.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Keine Daten von willhaben erhalten (403/blocked). Bitte direkt auf willhaben suchen.', listings: [], directUrl: htmlUrl }),
      { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=60' } }
    );
  }

  return new Response(
    JSON.stringify({ listings: result, count: result.length, directUrl: htmlUrl }),
    { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 's-maxage=120, stale-while-revalidate=60' } }
  );
}

function buildJsonApiUrl(category, condition, priceMin, priceMax, keyword, rows) {
  // Extract numeric category ID from slug e.g. "smartphones-handys-2722" -> 2722
  const catIdMatch = category.match(/(\d+)$/);
  const catId = catIdMatch ? catIdMatch[1] : '';
  let url = `https://www.willhaben.at/iad/v1.16/user-searches/search?areaId=900&rows=${rows}&PRICE_FROM=${priceMin}&PRICE_TO=${priceMax}&sort=1`;
  if (catId) url += `&categoryId=${catId}`;
  if (condition) url += `&CONDITION=${condition}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
  return url;
}

function buildHtmlUrl(category, condition, priceMin, priceMax, keyword, rows) {
  let url = `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz/${category}?rows=${rows}&PRICE_FROM=${priceMin}&PRICE_TO=${priceMax}&sort=1`;
  if (condition) url += `&CONDITION=${condition}`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
  return url;
}

async function tryJsonApi(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'de-AT,de;q=0.9',
        'Referer': 'https://www.willhaben.at/',
        'Origin': 'https://www.willhaben.at',
        'X-Wh-Client': 'api=v1.16;client=willhaben;',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // JSON API returns advertSummaryList directly
    return data?.advertSummaryList?.advertSummary
      || data?.searchResult?.advertSummaryList?.advertSummary
      || data?.advertSummary
      || null;
  } catch (e) {
    return null;
  }
}

async function tryHtmlScrape(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    const props = data?.props?.pageProps;
    for (const k of ['searchResult', 'advertSummaryList', 'listings']) {
      if (props?.[k]) {
        const r = props[k];
        if (Array.isArray(r)) return r;
        if (r?.advertSummaryList?.advertSummary) return r.advertSummaryList.advertSummary;
        if (r?.advertSummary) return r.advertSummary;
        if (r?.items) return r.items;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  try {
    const raw = event.queryStringParameters && event.queryStringParameters.url;
    if (!raw) return { statusCode: 400, headers: cors, body: 'Missing url parameter' };
    const target = new URL(raw);
    const allowed = new Set([
      'api.weather.gov',
      'forecast.weather.gov',
      'mapservices.weather.noaa.gov',
      'nowcoast.noaa.gov',
      'www.spc.noaa.gov',
      'api.open-meteo.com',
      'air-quality-api.open-meteo.com',
      'services.arcgisonline.com'
    ]);
    if (!allowed.has(target.hostname)) {
      return { statusCode: 403, headers: cors, body: `Host not allowed: ${target.hostname}` };
    }
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'RBRTW-Auto-Weather-Studio/1.0 (Netlify proxy for local weather graphics)',
        'Accept': event.headers.accept || '*/*'
      }
    });
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cacheHeader = contentType.includes('image') ? 'public, max-age=240' : 'public, max-age=120';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return {
      statusCode: upstream.status,
      headers: {
        ...cors,
        'Content-Type': contentType,
        'Cache-Control': cacheHeader
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: `Proxy error: ${err.message}` };
  }
};

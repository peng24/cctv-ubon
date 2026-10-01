// Cloudflare Pages Function: Reverse Proxy for Ubon CCTV Streams
// Fixes duplicate Access-Control-Allow-Origin header issue from Wowza/Nginx

export async function onRequest(context) {
  const { request, params } = context;

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Get stream subpath (e.g. cam0001.stream/playlist.m3u8 or chunklist_xxx.ts)
  const pathParts = params.path;
  const subpath = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');
  const url = new URL(request.url);
  const targetUrl = `https://ubonwaterlevel.duckdns.org/wowza/${subpath}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    // Create a new Headers object and sanitize CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('Access-Control-Allow-Origin');
    newHeaders.delete('Access-Control-Allow-Methods');
    newHeaders.delete('Access-Control-Allow-Headers');
    newHeaders.delete('Access-Control-Allow-Credentials');

    // Set single clean CORS headers
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', '*');

    // Cache-Control headers
    if (subpath.endsWith('.m3u8')) {
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      newHeaders.set('Cache-Control', 'public, max-age=60');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return new Response(`Stream Fetch Error: ${err.message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain'
      }
    });
  }
}

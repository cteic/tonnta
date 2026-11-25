/**
 * Browsers call the alert endpoints from more than one site: the apex,
 * `www`, and the staging worker. A response may name only one origin, so
 * the worker echoes the caller's origin when it is on the allow-list.
 */

/** `ALLOWED_ORIGINS` is comma-separated; the site origin is always allowed. */
export function allowedOrigins(siteOrigin: string, extra: string | undefined): string[] {
  const listed = (extra ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return [...new Set([siteOrigin, ...listed])];
}

/**
 * Sets `Access-Control-Allow-Origin` to the request's origin when allowed.
 * Any other origin keeps the site origin, which the browser then refuses.
 * `Vary: Origin` stops a cache serving one origin's answer to another.
 */
export function withCors(
  response: Response,
  requestOrigin: string | null,
  allowed: readonly string[]
): Response {
  const result = new Response(response.body, response);
  if (requestOrigin !== null && allowed.includes(requestOrigin)) {
    result.headers.set('Access-Control-Allow-Origin', requestOrigin);
  }
  result.headers.append('Vary', 'Origin');
  return result;
}

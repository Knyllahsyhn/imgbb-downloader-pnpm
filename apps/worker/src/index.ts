import { fetchAlbum, parseAlbumInput, InvalidAlbumUrlError, AlbumNotFoundError } from "./scrape";

/** How long a successful album lookup may be reused (edge cache and browser). */
const CACHE_TTL_SECONDS = 300;

function baseHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function json(data: unknown, init: ResponseInit, env: Env): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...baseHeaders(env),
      ...init.headers,
    },
  });
}

async function handleAlbum(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const albumInput = url.searchParams.get("url");
  if (!albumInput) {
    return json({ error: "Missing query parameter 'url'." }, { status: 400 }, env);
  }

  let albumId: string;
  try {
    albumId = parseAlbumInput(albumInput).albumId;
  } catch (err) {
    if (err instanceof InvalidAlbumUrlError) {
      return json({ error: err.message }, { status: 400 }, env);
    }
    throw err;
  }

  // Normalised cache key, so different spellings of the same album share one entry.
  const cacheKey = new Request(new URL(`/api/album/${encodeURIComponent(albumId)}`, url.origin));
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await env.ALBUM_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
      env,
    );
  }

  try {
    const result = await fetchAlbum(albumInput);
    const response = json(
      result,
      {
        status: 200,
        headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` },
      },
      env,
    );
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    if (err instanceof InvalidAlbumUrlError) {
      return json({ error: err.message }, { status: 400 }, env);
    }
    if (err instanceof AlbumNotFoundError) {
      return json({ error: err.message }, { status: 404 }, env);
    }
    console.error(
      JSON.stringify({
        message: "album lookup failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return json({ error: "Unexpected error while loading the album." }, { status: 502 }, env);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { ...baseHeaders(env), "Access-Control-Max-Age": "86400" },
      });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true }, { status: 200 }, env);
    }

    if (url.pathname === "/api/album" && request.method === "GET") {
      return handleAlbum(request, url, env, ctx);
    }

    return json({ error: "Not found" }, { status: 404 }, env);
  },
} satisfies ExportedHandler<Env>;

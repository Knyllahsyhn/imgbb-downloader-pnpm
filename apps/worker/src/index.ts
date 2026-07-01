import { fetchAlbum, InvalidAlbumUrlError, AlbumNotFoundError } from "./scrape";
import type { Env } from "./types";

function corsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, init: ResponseInit, env: Env): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(env),
      ...init.headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true }, { status: 200 }, env);
    }

    if (url.pathname === "/api/album" && request.method === "GET") {
      const albumInput = url.searchParams.get("url");
      if (!albumInput) {
        return json({ error: "Missing query parameter 'url'." }, { status: 400 }, env);
      }

      try {
        const result = await fetchAlbum(albumInput);
        return json(result, { status: 200 }, env);
      } catch (err) {
        if (err instanceof InvalidAlbumUrlError) {
          return json({ error: err.message }, { status: 400 }, env);
        }
        if (err instanceof AlbumNotFoundError) {
          return json({ error: err.message }, { status: 404 }, env);
        }
        console.error(err);
        return json({ error: "Unexpected error while loading the album." }, { status: 502 }, env);
      }
    }

    return json({ error: "Not found" }, { status: 404 }, env);
  },
};

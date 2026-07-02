# Privacy Notice

Last updated: 2026-07-02

This document explains what data the imgbb Album Downloader collects, processes, or stores when using the Cloudflare Worker and web frontend, and what privacy guarantees are provided by the default project configuration.

If you deploy your own instance of the worker or enable additional monitoring/analytics, you are responsible for updating this notice to reflect those changes.

## Summary

- The worker fetches imgbb album pages server-side to extract image metadata (IDs, titles, URLs, ordering, timestamps, etc.) and returns that information as JSON.
- Image bytes are not proxied through the worker — the browser downloads images directly from i.ibb.co when zipping/downloading. The worker does not persist image files.
- Server-side logging is disabled in the worker code that was recently committed. The worker does not persist album URLs, image URLs, or image content to any repository-controlled storage.
- The project does not include analytics, third-party trackers, or crash-reporting integrations by default.

## Request handling

- What the worker receives: when you call the worker's API (GET /api/album?url=...), the worker receives the album page URL and any standard HTTP headers sent by the client.
- What the worker does: it fetches the album page HTML and/or calls imgbb's JSON endpoints to build a complete image metadata list. It returns structured JSON containing metadata and direct image URLs.
- Image bytes: the worker does not download or forward the actual image bytes to the client. Clients fetch images directly from the origin (i.ibb.co).

## Logging and retention

- Default repository configuration: server-side logging has been disabled in the worker code that was recently committed. The worker does not write request logs, album URLs, image URLs, or image content to long-term storage under this repository's code.
- Transient processing: the worker may handle data in-memory while generating the JSON response. This data is not persisted by the worker code itself.
- Platform logs: note that Cloudflare (or any other hosting platform you use) may retain logs independently of the worker code. These logs may include request timestamps, source IPs, and request paths depending on your account and Cloudflare settings. If you self-host, review your account's logging/analytics settings and any retention policies.

## Analytics, third parties, and error reporting

- The project does not include analytics or crash-reporting integrations by default. If you add services such as Sentry, Google Analytics, Plausible, Cloudflare analytics, or other monitoring, update this notice to describe what those services collect and their retention windows (for example: IP addresses, timestamps, stack traces, partial request payloads).

## Self-hosting and deployer responsibilities

If you deploy this project (for example, to your own Cloudflare account), you should:

- Review your Cloudflare account settings for any account- or tenant-level logging or analytics. Cloudflare may retain request logs and other metadata even if the worker code does not persist logs.
- Set wrangler/worker environment variables (for example ALLOWED_ORIGIN) to restrict which origins may call your worker.
- If you enable any third-party monitoring, add details here describing what data is collected and how long it is stored.
- Ensure your deployment follows applicable laws and regulations for your users (for example GDPR, CCPA), and add a publicly visible privacy policy if required by those laws.

## Security and minimized data collection

- The project follows a principle of data minimization: only the metadata necessary to build the album listing is fetched and returned.
- No user accounts are maintained by this project, and the worker does not create or store user identifiers by default.

## When this notice should be updated

- You add analytics, monitoring, or error reporting.
- You change the worker to persist album URLs, image metadata, or image content to storage.
- You change hosting providers or enable account-level logging that affects data retention.

## Contact

If you have privacy questions about this repository or a specific deployment, open an issue on the repository or contact the repository owner.

---

This project is provided under the MIT license. See LICENSE for terms.

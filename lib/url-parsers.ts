// lib/url-parsers.ts
//
// All "pull an ID out of a pasted URL" helpers in one place — WCL/FFLogs
// report URLs and YouTube/Twitch video URLs. Formerly lib/log-url.ts and
// lib/youtube.ts; both boiled down to the same kind of task, so they now
// live together instead of one tiny file per URL format.

// ─── Report URLs (WarcraftLogs / FFLogs) ───────────────────────────────────
//
// Used by page.tsx (to dispatch an import) and by the session lookup API
// route (to match a pasted URL against saved sessions' stored reportUrl) —
// both need to agree on what counts as "the same log", e.g. with or without
// a trailing ?fight=N.

export type LogSource = "wcl" | "ffl";

export function parseLogUrl(input: string): { source: LogSource; code: string } | null {
  const trimmed = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathMatch = parsed.pathname.match(/^\/reports\/([a-zA-Z0-9]+)/);
  if (!pathMatch) return null;

  const code = pathMatch[1];

  if (hostname === "www.warcraftlogs.com" || hostname === "warcraftlogs.com") {
    return { source: "wcl", code };
  }

  if (hostname === "www.fflogs.com" || hostname === "fflogs.com") {
    return { source: "ffl", code };
  }

  return null;
}

// ─── YouTube URLs ───────────────────────────────────────────────────────────

export type YouTubeVideoInfo = {
  videoId: string;
  embedUrl: string;
};

/**
 * Extracts a YouTube video ID from most common URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/live/ID
 * - https://www.youtube.com/shorts/ID
 * - https://www.youtube.com/embed/ID
 */
export function parseYouTubeUrl(url: string): YouTubeVideoInfo | null {
  try {
    const parsed = new URL(url.trim());

    let videoId = "";

    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.replace("/", "");
    }

    // youtube.com/watch?v=VIDEO_ID
    else if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v") || "";
    }

    // youtube.com/live/VIDEO_ID
    else if (parsed.pathname.startsWith("/live/")) {
      videoId = parsed.pathname.split("/")[2];
    }

    // youtube.com/shorts/VIDEO_ID
    else if (parsed.pathname.startsWith("/shorts/")) {
      videoId = parsed.pathname.split("/")[2];
    }

    // youtube.com/embed/VIDEO_ID
    else if (parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2];
    }

    // fallback cleanup (just in case)
    if (videoId) {
      videoId = videoId.split("?")[0].split("&")[0];
    }

    if (!videoId) {
      return null;
    }

    return {
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1`,
    };
  } catch {
    return null;
  }
}

// ─── Twitch URLs ────────────────────────────────────────────────────────────

/**
 * Extracts a Twitch VOD's numeric ID. Only past broadcasts, highlights and
 * uploads (/videos/ID): clips use a different embed and aren't VODs.
 * Supports:
 * - https://www.twitch.tv/videos/ID (also m.twitch.tv, with or without ?t=)
 * - https://player.twitch.tv/?video=ID (or v<ID>)
 */
export function parseTwitchUrl(url: string): { videoId: string } | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (host !== "twitch.tv" && !host.endsWith(".twitch.tv")) return null;

    const pathMatch = parsed.pathname.match(/^\/videos\/(\d+)/);
    if (pathMatch) return { videoId: pathMatch[1] };

    const param = parsed.searchParams.get("video")?.match(/^v?(\d+)$/);
    if (param) return { videoId: param[1] };

    return null;
  } catch {
    return null;
  }
}

// ─── Any VOD URL ────────────────────────────────────────────────────────────

export type ParsedVodUrl =
  | { source: "youtube"; videoId: string; embedUrl: string }
  | { source: "twitch";  videoId: string; embedUrl: "" };

// A pasted (or saved) VOD link as YouTube or Twitch. Twitch is tried first
// because the YouTube parser accepts any host with a /watch or /live/ path.
export function parseVodUrl(url: string): ParsedVodUrl | null {
  const twitch = parseTwitchUrl(url);
  if (twitch) return { source: "twitch", videoId: twitch.videoId, embedUrl: "" };
  const yt = parseYouTubeUrl(url);
  if (yt) return { source: "youtube", ...yt };
  return null;
}

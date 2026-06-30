// lib/youtube.ts

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
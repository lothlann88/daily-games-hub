/**
 * Utility to fetch game logos/favicons from URLs
 */

/**
 * The favicon URL a game's page URL resolves to. Pure and synchronous, so
 * lib/game-revisions.ts can refresh a stale logo whenever it moves a game to
 * a new site — a URL change with the old logo left behind is how Heardle
 * ended up wearing Spotify's badge.
 */
export function faviconUrlFor(url: string): string | null {
  try {
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Candidate favicon sources in order of preference:
    //   Google's service (used — most reliable),
    //   `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    //   `${urlObj.protocol}//${domain}/favicon.ico`.
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (error) {
    console.error("Error building game logo URL:", error);
    return null;
  }
}

export async function fetchGameLogo(url: string): Promise<string | null> {
  return faviconUrlFor(url);
}

/**
 * Fetch logos for multiple games
 */
export async function fetchLogosForGames(
  games: Array<{ id: string; url: string; logoUrl?: string }>
): Promise<Map<string, string>> {
  const logoMap = new Map<string, string>();

  for (const game of games) {
    // Skip if logo already exists
    if (game.logoUrl) {
      logoMap.set(game.id, game.logoUrl);
      continue;
    }

    const logoUrl = await fetchGameLogo(game.url);
    if (logoUrl) {
      logoMap.set(game.id, logoUrl);
    }
  }

  return logoMap;
}

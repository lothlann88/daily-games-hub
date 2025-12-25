/**
 * Utility to fetch game logos/favicons from URLs
 */

export async function fetchGameLogo(url: string): Promise<string | null> {
  try {
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Try multiple favicon sources in order of preference
    const faviconSources = [
      // Google's favicon service (most reliable)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      // DuckDuckGo favicon service
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // Direct favicon from domain
      `${urlObj.protocol}//${domain}/favicon.ico`,
    ];

    // Return the first working favicon URL
    // We'll use Google's service as it's most reliable
    return faviconSources[0];
  } catch (error) {
    console.error("Error fetching game logo:", error);
    return null;
  }
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

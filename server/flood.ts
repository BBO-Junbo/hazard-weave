export async function fetchOfficialJson(
  url: string,
  timeoutMs = 15_000,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HazardWeave/0.3 (+https://vercel.app)',
      },
    });
    if (!response.ok) {
      throw new Error(`Upstream request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function cachePublic(response: { setHeader(name: string, value: string): void }, seconds = 300) {
  response.setHeader(
    'Cache-Control',
    `s-maxage=${seconds}, stale-while-revalidate=${Math.max(seconds * 4, 600)}`,
  );
}

import "server-only";

// Counts the user's commits since a date using GitHub's public search API.
// No token needed (10 req/min); set GITHUB_TOKEN to raise the limit.
// Results are cached by Next.js for 10 minutes.
export async function getWeeklyCommits(username: string | null | undefined, since: Date) {
  if (!username) return null;

  const day = since.toISOString().slice(0, 10);
  const query = encodeURIComponent(`author:${username} author-date:>=${day}`);
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/search/commits?q=${query}&per_page=1`, {
      headers,
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { total_count: number };
    return { count: data.total_count };
  } catch {
    // Offline or rate limited: the dashboard just shows "—"
    return null;
  }
}

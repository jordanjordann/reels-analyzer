export function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split("/");
    const reelIndex = pathParts.indexOf("reel");
    if (reelIndex >= 0 && pathParts[reelIndex + 1]) {
      const code = pathParts[reelIndex + 1];
      return `instagram.com/reel/${code.slice(0, 6)}...`;
    }
    return u.hostname + u.pathname.slice(0, 20) + "...";
  } catch {
    return url.slice(0, 30) + "...";
  }
}

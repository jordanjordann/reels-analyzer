export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error((data as { error?: string }).error ?? response.statusText);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return data as T;
}

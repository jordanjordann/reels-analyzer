import type {
  AnalysesUserReelsResponse,
  AnalysesReelDetailResponse,
} from "./types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error((data as { error?: string }).error ?? response.statusText);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return data as T;
}

export async function getAnalysisUserReels(username: string): Promise<AnalysesUserReelsResponse> {
  return fetchJson<AnalysesUserReelsResponse>(
    `/api/analyses?username=${encodeURIComponent(username)}`,
  );
}

export async function getAnalysisReelDetail(shortcode: string): Promise<AnalysesReelDetailResponse> {
  return fetchJson<AnalysesReelDetailResponse>(
    `/api/analyses/${encodeURIComponent(shortcode)}`,
  );
}

export async function deleteAnalysisReel(shortcode: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(
    `/api/analyses/${encodeURIComponent(shortcode)}`,
    { method: "DELETE" },
  );
}

import type { ProfileAnalysis } from "@/shared/analysis/profile-types";

export type ProfileAnalysisResponse = {
  profile: (ProfileAnalysis & { reelCount: number; updatedAt: string }) | null;
};

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

export async function getProfileAnalysis(username: string): Promise<ProfileAnalysisResponse> {
  return fetchJson<ProfileAnalysisResponse>(`/api/profile-analysis?username=${encodeURIComponent(username)}`);
}

export async function refreshProfileAnalysis(username: string): Promise<ProfileAnalysisResponse> {
  return fetchJson<ProfileAnalysisResponse>(
    `/api/profile-analysis?username=${encodeURIComponent(username)}`,
    { method: "POST" },
  );
}

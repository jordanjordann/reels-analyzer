import type { ProfilesListResponse, ProfileDetailResponse } from "./types";

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

export async function getProfileList(): Promise<ProfilesListResponse> {
  return fetchJson<ProfilesListResponse>("/api/profiles");
}

export async function getProfileDetail(username: string): Promise<ProfileDetailResponse> {
  return fetchJson<ProfileDetailResponse>(
    `/api/profiles/${encodeURIComponent(username)}`,
  );
}

export async function refreshProfileAnalysis(username: string): Promise<ProfileDetailResponse> {
  return fetchJson<ProfileDetailResponse>(
    `/api/profiles/${encodeURIComponent(username)}`,
    { method: "POST" },
  );
}

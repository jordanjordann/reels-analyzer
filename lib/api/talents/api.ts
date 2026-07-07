import type { TalentsListResponse, TalentDetailResponse, AddTalentFormData } from "./types";
import { fetchJson } from "@/shared/api";

export async function getTalentList(): Promise<TalentsListResponse> {
  return fetchJson<TalentsListResponse>("/api/talents");
}

export async function getTalentDetail(id: string): Promise<TalentDetailResponse> {
  return fetchJson<TalentDetailResponse>(`/api/talents/${encodeURIComponent(id)}`);
}

export async function createTalent(data: AddTalentFormData): Promise<TalentDetailResponse> {
  return fetchJson<TalentDetailResponse>("/api/talents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function refreshTalentAnalysis(id: string): Promise<TalentDetailResponse> {
  return fetchJson<TalentDetailResponse>(`/api/talents/${encodeURIComponent(id)}`, {
    method: "POST",
  });
}

export async function deleteTalent(id: string): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`/api/talents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

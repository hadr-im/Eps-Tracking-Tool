// API calls for the manual leads page.

import { apiClient } from './apiClient';
import type {
  ManualLead,
  ManualLeadsApiResponse,
  ManualLeadPayload,
  ManualLeadApiResponse,
  ExpaLookupResult,
  ExpaLookupApiResponse,
} from '../types/manualLead';

// GET /manual-leads — unassigned hand-entered leads for the caller's department
export async function fetchManualLeads(): Promise<ManualLead[]> {
  const { data } = await apiClient.get<ManualLeadsApiResponse>('/manual-leads');
  return data.data;
}

// GET /manual-leads/expa/:expaId — prefill lookup, saves nothing
export async function lookupExpaPerson(expaId: string): Promise<ExpaLookupResult> {
  const { data } = await apiClient.get<ExpaLookupApiResponse>(
    `/manual-leads/expa/${encodeURIComponent(expaId)}`,
  );
  return data.data;
}

// POST /manual-leads
export async function createManualLead(payload: ManualLeadPayload): Promise<ManualLead> {
  const { data } = await apiClient.post<ManualLeadApiResponse>('/manual-leads', payload);
  return data.data;
}

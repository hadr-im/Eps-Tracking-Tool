// signupService (signup form lookups + submission)
// The two lookup endpoints are public: the caller has no account yet.

import axios from 'axios';
import { apiClient } from './apiClient';
import type {
  CompleteGoogleSignupPayload,
  Department,
  SignupPayload,
  SignupResponse,
  TeamLeaderOption,
} from '../types/signup';

interface ListResponse<T> {
  data: T[];
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<ListResponse<Department>>(
    '/auth/signup-options/departments',
  );
  return data.data;
}

export async function fetchTeamLeaders(departmentId: string): Promise<TeamLeaderOption[]> {
  const { data } = await apiClient.get<ListResponse<TeamLeaderOption>>(
    `/auth/signup-options/departments/${departmentId}/team-leaders`,
  );
  return data.data;
}

export async function submitSignup(payload: SignupPayload): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/auth/signup', payload);
  return data;
}

export async function completeGoogleSignup(
  payload: CompleteGoogleSignupPayload,
): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/auth/complete-signup', payload);
  return data;
}

/*
  Signup errors are written to be read by the applicant — "Ahmed is already the
  dispatcher for this department" is far more useful than a generic 409 blurb,
  so prefer the server's message and fall back only when there isn't one.
*/
export function getSignupError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim() !== '') return message;
    if (!err.response) return 'Network error, please check your connection.';
  }
  return fallback;
}

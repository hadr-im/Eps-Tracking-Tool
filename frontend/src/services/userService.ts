import { apiClient } from './apiClient';
import type { AuthUser } from '@/types/auth';

// Profile shape returned by GET /users/me and PATCH /users/me
// Extends AuthUser with read-only fields not needed in the JWT payload
export interface UserProfile extends AuthUser {
  role: AuthUser['role'];
  departmentId: string | null;
}

export interface UpdateProfilePayload {
  fullName: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const userService = {
  getMyProfile: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/users/me');
    return data;
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    const { data } = await apiClient.patch<UserProfile>('/users/me', payload);
    return data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(
      '/users/me/change-password',
      payload,
    );
    return data;
  },
};

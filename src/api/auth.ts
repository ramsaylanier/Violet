/**
 * Client-side auth API functions
 */

import { apiGet, apiPost } from './client.js';
import type { User } from '@/types';

export async function createSession(idToken: string): Promise<User> {
  return apiPost<User>('/auth/session', { idToken });
}

export async function getCurrentUser(): Promise<User | null> {
  return apiGet<User | null>('/auth/user');
}

export async function updateCurrentUser(data: { name?: string; githubToken?: string }): Promise<User> {
  return apiPost<User>('/auth/update', data);
}

export async function logout(): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/auth/logout');
}

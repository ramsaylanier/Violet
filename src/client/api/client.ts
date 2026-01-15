/**
 * Base API client for making fetch requests
 */

import { getAuthToken } from "@/client/lib/auth-client";

const API_BASE_URL = "/api";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get the Firebase ID token for authentication
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include", // Include cookies in requests
    headers
  });

  console.log({ status: response.status });

  // Handle 401 Unauthorized - token may have expired
  if (response.status === 401 && retryOn401) {
    try {
      // Force refresh the token
      const refreshedToken = await getAuthToken(true);
      console.log({ refreshedToken });

      if (!refreshedToken) {
        // User is logged out, throw error
        const error = await response.json().catch(() => ({
          message: "Authentication failed. Please sign in again."
        }));
        throw new Error(
          error.message || "Authentication failed. Please sign in again."
        );
      }

      // Retry the request with the refreshed token (only once)
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>)
      };
      retryHeaders["Authorization"] = `Bearer ${refreshedToken}`;

      const retryResponse = await fetch(url, {
        ...options,
        credentials: "include",
        headers: retryHeaders
      });

      if (!retryResponse.ok) {
        const error = await retryResponse
          .json()
          .catch(() => ({ message: retryResponse.statusText }));
        throw new Error(
          error.message || `HTTP error! status: ${retryResponse.status}`
        );
      }

      return retryResponse.json();
    } catch (error) {
      // If token refresh failed or retry failed, throw the error
      throw error;
    }
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
}

export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined
  });
}

export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined
  });
}

export async function apiPatch<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined
  });
}

export async function apiDelete<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "DELETE",
    body: data ? JSON.stringify(data) : undefined
  });
}

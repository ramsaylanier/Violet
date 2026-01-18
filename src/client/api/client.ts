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

  // Handle 401 Unauthorized - token may have expired
  if (response.status === 401 && retryOn401) {
    try {
      // Force refresh the token
      const refreshedToken = await getAuthToken(true);

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

        if (error.needsAuth) {
          try {
            const disconnectUrl = `${API_BASE_URL}/firebase/oauth/disconnect`;
            await fetch(disconnectUrl, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(refreshedToken
                  ? { Authorization: `Bearer ${refreshedToken}` }
                  : {})
              }
            });
          } catch (clearError) {
            console.error("Failed to clear Google tokens:", clearError);
          }
        }

        console.log(error);

        throw new Error(
          error.message || `HTTP error! status: ${retryResponse.status}`
        );
      }

      return retryResponse.json();
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));

    // Check if this is a Google auth error that requires reconnection
    if (
      error.needsAuth &&
      (error.message?.includes("no refresh token available") ||
        error.message?.includes(
          "Token expired and no refresh token available"
        ) ||
        error.message?.includes("Please reconnect your Google account"))
    ) {
      // Automatically clear Google tokens from user profile
      // We call the API directly to avoid circular dependency
      try {
        const token = await getAuthToken();
        const disconnectUrl = `${API_BASE_URL}/firebase/oauth/disconnect`;
        await fetch(disconnectUrl, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } catch (clearError) {
        console.error("Failed to clear Google tokens:", clearError);
        // Continue anyway - we'll still throw the original error
      }
    }

    throw new Error(error.message || error.error);
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

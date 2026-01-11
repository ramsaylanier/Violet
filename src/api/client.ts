/**
 * Base API client for making fetch requests
 */

const API_BASE_URL = "/api";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include", // Include cookies in requests
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

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
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}

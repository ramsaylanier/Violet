import { auth } from "./firebase";

/**
 * Get the current Firebase auth token
 * @param forceRefresh - If true, forces a token refresh even if the current token is still valid
 */
export async function getAuthToken(
  forceRefresh = false
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(forceRefresh);
}

/**
 * Create headers with authentication for server function calls
 * TanStack Start server functions can access headers from the request
 */
export async function getAuthHeaders(): Promise<Headers> {
  const token = await getAuthToken();
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}

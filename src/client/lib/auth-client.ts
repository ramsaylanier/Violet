import { auth } from "./firebase";

/**
 * Get the current Firebase auth token
 * Firebase's getIdToken() automatically refreshes expired tokens
 * @param forceRefresh - If true, forces a token refresh even if the current token is still valid
 */
export async function getAuthToken(
  forceRefresh = false
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // getIdToken automatically refreshes expired tokens
    // If forceRefresh is true, it will always refresh
    const token = await user.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    // If token refresh fails, user might need to re-authenticate
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Create headers with authentication for server function calls
 * TanStack Start server functions can access headers from the request
 * Automatically refreshes token if expired (handled by getAuthToken)
 */
export async function getAuthHeaders(): Promise<Headers> {
  const token = await getAuthToken();
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}

/**
 * Update session cookie with new token
 * This should be called after token refresh to keep the session in sync
 */
export async function updateSessionCookie(): Promise<void> {
  const token = await getAuthToken();
  if (!token) return;

  try {
    // Update session cookie by calling the session endpoint
    await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ idToken: token })
    });
  } catch (error) {
    console.error("Error updating session cookie:", error);
    // Don't throw - session update failure shouldn't break the app
  }
}

import { getUserProfile, updateUserProfile } from "./authService";

/**
 * Custom error class for authentication/authorization errors
 */
export class AuthenticationError extends Error {
  statusCode: number;
  needsAuth: boolean;

  constructor(message: string, statusCode = 401, needsAuth = true) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = statusCode;
    this.needsAuth = needsAuth;
  }
}

/**
 * Check if an error indicates an expired or invalid token
 */
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  // Check for HTTP status codes
  if (typeof error === "object" && "status" in error) {
    const status = error.status;
    if (status === 401 || status === 403) {
      return true;
    }
  }

  // Check for error messages
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  const expiredIndicators = [
    "invalid_token",
    "expired_token",
    "token_expired",
    "unauthorized",
    "authentication required",
    "invalid_grant",
    "invalid authentication credentials",
    "invalid authentication",
    "authentication credential"
  ];

  return expiredIndicators.some((indicator) =>
    errorMessage.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Check if a fetch response indicates an expired token
 */
export function isTokenExpiredResponse(response: Response): boolean {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  // Check response body for token expiration indicators
  // Note: This is async, so we'll check status first
  return false;
}

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshGoogleAccessToken(
  userId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error_description ||
        errorData.error ||
        "Failed to refresh access token"
    );
  }

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    throw new Error(tokenData.error_description || tokenData.error);
  }

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error("No access token received from refresh");
  }

  // Update the access token in user profile
  // If a new refresh token is provided, update that too
  const updates: { googleToken: string; googleRefreshToken?: string } = {
    googleToken: accessToken
  };

  if (tokenData.refresh_token) {
    updates.googleRefreshToken = tokenData.refresh_token;
  }

  await updateUserProfile(userId, updates);

  return accessToken;
}

/**
 * Get a valid Google OAuth access token for a user
 * If the token is expired or invalid, refresh it automatically
 */
export async function getValidGoogleToken(userId: string): Promise<string> {
  const userProfile = await getUserProfile(userId);

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  if (!userProfile.googleToken) {
    throw new Error("Google account not connected");
  }

  // If we have a refresh token, we can refresh the access token when needed
  // For now, return the stored token. The refresh will happen when we detect an error
  return userProfile.googleToken;
}

/**
 * Execute a function with automatic token refresh on expiration
 * If the function fails with a token expiration error, refresh the token and retry once
 */
export async function withTokenRefresh<T>(
  userId: string,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  let accessToken = await getValidGoogleToken(userId);
  const userProfile = await getUserProfile(userId);

  if (!userProfile?.googleRefreshToken) {
    try {
      return await fn(accessToken);
    } catch (error) {
      if (isTokenExpiredError(error)) {
        throw new AuthenticationError(
          "Token expired and no refresh token available. Please reconnect your Google account.",
          401,
          true
        );
      }
      throw error;
    }
  }

  try {
    return await fn(accessToken);
  } catch (error) {
    // Check if error is due to expired token
    if (isTokenExpiredError(error)) {
      // Refresh the token and retry
      accessToken = await refreshGoogleAccessToken(
        userId,
        userProfile.googleRefreshToken
      );
      return await fn(accessToken);
    }
    throw error;
  }
}

/**
 * Execute a fetch request with automatic token refresh on expiration
 * If the request fails with 401/403, refresh the token and retry once
 */
export async function fetchWithTokenRefresh(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return withTokenRefresh(userId, async (accessToken) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });

    // Check if response indicates token expiration
    // For 401/403, we should always try to refresh the token
    if (response.status === 401 || response.status === 403) {
      // Try to parse error message for better error details
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage =
          errorData.error?.message ||
          errorData.error_description ||
          errorData.error ||
          response.statusText;
      } catch {
        // If we can't parse JSON, use status text
        // This is fine - we'll still treat it as an auth error
      }

      // Check if this looks like a token expiration error
      // For 401/403 from Google APIs, we assume it's token-related
      if (isTokenExpiredError(errorMessage) || response.status === 401) {
        // Create an error that will trigger token refresh
        throw new AuthenticationError(errorMessage, response.status, true);
      }

      // For 403, it might be a permissions issue, but we'll still try refreshing
      if (response.status === 403) {
        throw new AuthenticationError(
          errorMessage || "Access forbidden. Token may be invalid.",
          response.status,
          true
        );
      }
    }

    return response;
  });
}

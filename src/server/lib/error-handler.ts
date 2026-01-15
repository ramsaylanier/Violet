import express from "express";
import { AuthenticationError } from "@/server/services/googleTokenService";

/**
 * Helper function to handle errors consistently across all routes
 * Returns the appropriate HTTP response based on error type
 *
 * @param error - The error to handle
 * @param res - Express response object
 * @param defaultMessage - Default error message if error is not an Error instance
 * @returns Express response with appropriate status code and error message
 */
export function handleError(
  error: unknown,
  res: express.Response,
  defaultMessage = "Internal server error"
): express.Response {
  // Handle authentication errors
  if (error instanceof Error && error.message === "Unauthorized") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check for AuthenticationError from googleTokenService
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AuthenticationError" &&
    "statusCode" in error &&
    "needsAuth" in error
  ) {
    const authError = error as AuthenticationError;
    return res.status(authError.statusCode).json({
      error: authError.message,
      needsAuth: authError.needsAuth
    });
  }

  // Check if error indicates token refresh failed (legacy check)
  if (
    error instanceof Error &&
    error.message.includes("no refresh token available")
  ) {
    return res.status(401).json({
      error: "Token expired. Please reconnect your Google account.",
      needsAuth: true
    });
  }

  // Default error handling
  console.error("Error:", error);
  return res.status(500).json({
    error: error instanceof Error ? error.message : defaultMessage
  });
}

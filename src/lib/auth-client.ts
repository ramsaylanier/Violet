import { auth } from './firebase'

/**
 * Get the current Firebase auth token
 */
export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return await user.getIdToken()
}

/**
 * Create headers with authentication for server function calls
 * TanStack Start server functions can access headers from the request
 */
export async function getAuthHeaders(): Promise<Headers> {
  const token = await getAuthToken()
  const headers = new Headers()
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }
  return headers
}

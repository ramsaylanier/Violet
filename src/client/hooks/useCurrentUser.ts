import { useEffect, useState } from "react";
import { getCurrentUser } from "@/client/api/auth";
import type { User } from "@/shared/types";

/**
 * Hook to load and manage the current user
 * @returns { user, loadingUser } - The user object and loading state
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  return { user, loadingUser };
}

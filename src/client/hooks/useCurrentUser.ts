import { getCurrentUser } from "@/client/api/auth";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to load and manage the current user
 * @returns { user, loadingUser } - The user object and loading state
 */
export function useCurrentUser() {
  const { data, isPending } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser()
  });

  return { user: data, loadingUser: isPending };
}

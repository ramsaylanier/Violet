import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  createSession,
  logout as logoutFn,
} from "@/server/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { User } from "@/types";

export function useAuth() {
  const queryClient = useQueryClient();

  // Query for the current user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      // Authenticate with Firebase client SDK
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      // Create session cookie on server
      // @ts-ignore - Type definitions for server functions with data are not perfect
      return await createSession({ data: { idToken } });
    },
    onSuccess: () => {
      // Invalidate and refetch user query
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      // Create user with Firebase client SDK
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      // Create session cookie on server
      // @ts-ignore - Type definitions for server functions with data are not perfect
      return await createSession({ data: { idToken } });
    },
    onSuccess: () => {
      // Invalidate and refetch user query
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Sign out from Firebase client SDK
      await signOut(auth);
      // Clear session cookie on server
      return await logoutFn();
    },
    onSuccess: () => {
      // Clear user query and reset cache
      queryClient.setQueryData(["currentUser"], null);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCurrentUser } from "@/server/auth";
import type { User } from "@/types";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          // TanStack Start server functions automatically handle authentication
          // We need to set the auth token in a way the server can access it
          // For now, we'll fetch the user profile directly
          const idToken = await firebaseUser.getIdToken();

          // Call server function - TanStack Start will handle the request
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Try to create user profile if it doesn't exist
          try {
            const email = firebaseUser.email || "";
            const name = firebaseUser.displayName || undefined;
            // We'll handle user creation on the backend when auth token is verified
            setUser({
              id: firebaseUser.uid,
              email,
              name,
              createdAt: new Date(),
            });
          } catch (createError) {
            console.error("Failed to create user profile:", createError);
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return {
    user,
    firebaseUser,
    login,
    signup,
    logout,
    isAuthenticated: !!firebaseUser,
  };
}

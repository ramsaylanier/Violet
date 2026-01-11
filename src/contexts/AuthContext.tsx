import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
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

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "AuthContext.tsx:39",
            message: "onAuthStateChanged callback - firebaseUser state",
            data: { hasFirebaseUser: !!firebaseUser, uid: firebaseUser?.uid },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          // TanStack Start server functions need the auth token in the request headers
          const idToken = await firebaseUser.getIdToken();

          // #region agent log
          fetch(
            "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "AuthContext.tsx:48",
                message:
                  "onAuthStateChanged - got idToken, before getCurrentUser",
                data: { hasToken: !!idToken, tokenLength: idToken?.length },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "A",
              }),
            }
          ).catch(() => {});
          // #endregion

          // Call server function with request object containing authorization header
          const userData = await getCurrentUser({
            request: new Request("http://localhost", {
              headers: {
                authorization: `Bearer ${idToken}`,
              },
            }),
          });

          // #region agent log
          fetch(
            "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "AuthContext.tsx:52",
                message: "onAuthStateChanged - getCurrentUser succeeded",
                data: { hasUserData: !!userData, userId: userData?.id },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "A",
              }),
            }
          ).catch(() => {});
          // #endregion

          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          console.error("Error details:", {
            message: (error as Error)?.message,
            name: (error as Error)?.name,
            stack: (error as Error)?.stack,
            error,
          });

          // #region agent log
          fetch(
            "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "AuthContext.tsx:69",
                message: "onAuthStateChanged - getCurrentUser failed",
                data: {
                  error: (error as Error)?.message,
                  errorName: (error as Error)?.name,
                  errorString: String(error),
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "A",
              }),
            }
          ).catch(() => {});
          // #endregion

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
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "AuthContext.tsx:105",
        message: "AuthContext login - before Firebase signIn",
        data: { email },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // #region agent log
      fetch(
        "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "AuthContext.tsx:111",
            message: "AuthContext login - Firebase signIn succeeded",
            data: {},
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Set user state immediately so isAuthenticated is true before navigation
      // This prevents the redirect loop where navigation happens before auth state is set
      const firebaseUser = userCredential.user;
      setFirebaseUser(firebaseUser);

      const idToken = await firebaseUser.getIdToken();
      try {
        const userData = await getCurrentUser({
          request: new Request("http://localhost", {
            headers: {
              authorization: `Bearer ${idToken}`,
            },
          }),
        });
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Fallback: set user from Firebase user data
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || undefined,
          createdAt: new Date(),
        });
      }
    } catch (err: any) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7243/ingest/c442ce9b-f50b-485d-b208-3f2f23f6c9ac",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "AuthContext.tsx:133",
            message: "AuthContext login - Firebase signIn failed",
            data: { error: err?.message, code: err?.code },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

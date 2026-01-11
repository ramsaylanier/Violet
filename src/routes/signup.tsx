import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/signup")({
  component: Signup,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    return {
      redirect: search.redirect ? (search.redirect as string) : undefined,
    };
  },
});

function Signup() {
  const { isAuthenticated } = useAuth();
  const { redirect } = useSearch({ from: "/signup" });

  // Redirect to home or original destination if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirect || "/_layout"} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <SignupForm redirect={redirect} />
    </div>
  );
}

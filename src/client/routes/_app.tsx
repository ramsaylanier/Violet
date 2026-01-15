import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/client/contexts/AuthContext";
import { useEffect } from "react";
import Header from "@/client/components/Header";

export const Route = createFileRoute("/_app")({
  component: Index
});

function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8">
      <Header />
      <Outlet />
    </div>
  );
}

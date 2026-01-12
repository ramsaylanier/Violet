import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  component: Login
});

function Login() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoginForm />
    </div>
  );
}

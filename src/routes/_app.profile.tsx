import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export const Route = createFileRoute("/_app/profile")({
  component: Profile
});

function Profile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="text-sm mt-1">{user?.email || "Not available"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Display Name
            </label>
            <p className="text-sm mt-1">{user?.displayName || "Not set"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              User ID
            </label>
            <p className="text-sm mt-1 font-mono">
              {user?.uid || "Not available"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import {
  createFileRoute,
  Navigate,
  useLocation,
  useSearch,
} from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/api/auth";
import { disconnectGitHub, getGitHubOAuthUrl } from "@/api/github";
import type { User } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      github_connected: (search.github_connected as string) || undefined,
      github_error: (search.github_error as string) || undefined,
    };
  },
});

function Settings() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const search = useSearch({ from: "/_app/settings" });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [isAuthenticated]);

  useEffect(() => {
    if (search.github_connected) {
      setMessage({
        type: "success",
        text: "GitHub account connected successfully!",
      });
      // Reload user to get updated githubToken
      getCurrentUser().then(setUser).catch(console.error);
      // Clear query param
      window.history.replaceState({}, "", location.pathname);
    } else if (search.github_error) {
      setMessage({
        type: "error",
        text: `Failed to connect GitHub: ${search.github_error}`,
      });
      // Clear query param
      window.history.replaceState({}, "", location.pathname);
    }
  }, [search.github_connected, search.github_error, location.pathname]);

  const handleConnectGitHub = async () => {
    setConnecting(true);
    try {
      // Fetch the OAuth URL with proper authentication
      const { url } = await getGitHubOAuthUrl();
      // Redirect to GitHub OAuth page
      window.location.href = url;
    } catch (error) {
      setConnecting(false);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to initiate GitHub connection",
      });
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectGitHub();
      setMessage({
        type: "success",
        text: "GitHub account disconnected successfully.",
      });
      // Reload user to get updated status
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to disconnect GitHub account",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} />;
  }

  const isGitHubConnected = !!user?.githubToken;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>GitHub</CardTitle>
            <CardDescription>
              Connect your GitHub account to enable repository management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Status:{" "}
                      {isGitHubConnected ? "Connected" : "Not connected"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isGitHubConnected
                        ? "Your GitHub account is connected. You can create repositories, issues, and more."
                        : "Connect your GitHub account to enable repository management features."}
                    </p>
                  </div>
                </div>
                {isGitHubConnected ? (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnectGitHub}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect GitHub"}
                  </Button>
                ) : (
                  <Button onClick={handleConnectGitHub} disabled={connecting}>
                    {connecting ? "Connecting..." : "Connect GitHub"}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API key management coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

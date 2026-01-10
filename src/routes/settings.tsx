import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">GitHub</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your GitHub account to enable repository management
          </p>
          <button className="px-4 py-2 border rounded-md hover:bg-accent">
            Connect GitHub
          </button>
        </div>
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for integrations
          </p>
        </div>
      </div>
    </div>
  )
}

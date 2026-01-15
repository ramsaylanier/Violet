# Violet

A development project management platform with GitHub and Firebase integrations, powered by AI agents.

## Features

- 🚀 **Project Management** - Create and manage development projects
- 🐙 **GitHub Integration** - Manage repositories, issues, and CI/CD pipelines
- 🔥 **Firebase Integration** - Create and configure Firebase projects
- 🤖 **AI Agents** - Automate tasks with LLM-powered agents using Claude
- 🎨 **Modern UI** - Built with TanStack Start, ShadCN UI, and Tailwind CSS
- 🔒 **Type-Safe** - End-to-end TypeScript with automatic type inference

## Tech Stack

- **Framework**: TanStack Start (React Router v7)
- **UI**: ShadCN UI + Tailwind CSS
- **Language**: TypeScript (strict mode)
- **LLM**: Anthropic Claude
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Firebase project with Firestore enabled
- GitHub OAuth app (optional, for GitHub integration)
- Anthropic API key (for AI features)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with your configuration:

```env
# Firebase Configuration (for client-side auth)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (for server-side operations)
# Either provide the full service account JSON as a string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
# OR set FIREBASE_PROJECT_ID to use Application Default Credentials
FIREBASE_PROJECT_ID=your-project-id

# Anthropic Claude API Key
ANTHROPIC_API_KEY=sk-ant-api03-...

# GitHub OAuth (optional, for GitHub integration)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Encryption Key (for secure token storage)
# Generate a secure key using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=your-base64-encoded-32-byte-key

# Cloudflare API (optional, for Cloudflare integration)
CLOUDFLARE_API_BASE_URL=https://api.cloudflare.com/client/v4

# Server Port (optional, defaults to 3000)
PORT=3000
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── routes/           # File-based routing (pages and API routes)
│   ├── api/         # Type-safe server functions
│   └── *.tsx        # Page routes
├── components/       # React components
│   ├── ui/          # ShadCN UI components
│   ├── ChatInterface.tsx
│   ├── ProjectList.tsx
│   └── LoginForm.tsx
├── services/         # Business logic
│   ├── authService.ts
│   ├── githubService.ts
│   └── firebaseService.ts
├── agents/          # LLM agent system
│   ├── agentExecutor.ts
│   └── tools/       # Agent tools
├── hooks/           # Custom React hooks
│   └── useAuth.ts
├── types/           # TypeScript types
└── lib/             # Utility functions
    ├── firebase.ts
    └── firebase-admin.ts
```

## Key Features Implemented

### ✅ Authentication

- Firebase Authentication (email/password)
- User profile management
- Protected server functions

### ✅ Project Management

- Create, read, update, delete projects
- Project listing with cards
- Project detail pages with tabs

### ✅ GitHub Integration

- Create repositories
- List repositories
- Create and list issues
- List workflows and branches
- Create pull requests

### ✅ Firebase Integration

- Initialize Firestore
- Setup Storage
- Setup Hosting

### ✅ AI Agent System

- Claude-powered agent executor
- Tool calling for GitHub and Firebase operations
- Chat interface for interacting with the agent
- Multi-step workflow support

### ✅ UI Components

- ShadCN UI components (Button, Card, Dialog, Tabs, etc.)
- Responsive design
- Authentication flow
- Project dashboard
- Chat interface

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Type check without building

## Authentication Setup

The application uses Firebase Authentication. When a user signs up or signs in, their profile is automatically created in Firestore. Server functions verify authentication using Firebase ID tokens passed in the Authorization header.

## Server Functions

TanStack Start provides type-safe server functions that are automatically typed on the client. All API operations go through server functions in `src/routes/api/`:

- `/api/auth` - User authentication and profile management
- `/api/projects` - Project CRUD operations
- `/api/github` - GitHub API operations
- `/api/firebase` - Firebase operations
- `/api/agent` - AI agent chat interface

## AI Agent

The AI agent can perform various actions through tool calling:

- Create GitHub repositories and issues
- Initialize Firebase projects and services
- Create and update projects
- Answer questions about your projects

Simply chat with the agent to request actions!

## Next Steps / Known Issues

1. **Authentication Token Passing**: Currently, server functions expect auth tokens in headers. TanStack Start may need middleware configuration to properly pass Firebase tokens from client to server. This might require:
   - Cookie-based auth token storage
   - Custom middleware for token injection
   - Or updating server functions to accept tokens in the data payload

2. **Task Queue System**: The task queue and background workers are planned but not yet implemented.

3. **GitHub OAuth**: GitHub OAuth flow needs to be implemented in the settings page.

4. **Firebase Project Creation**: Firebase Admin SDK project creation requires billing-enabled projects. The current implementation focuses on Firestore/Storage/Hosting setup for existing projects.

## License

MIT

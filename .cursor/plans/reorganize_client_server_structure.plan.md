# Reorganize Codebase into Client/Server/Shared Structure

## Overview

Reorganize the codebase to clearly separate client-side, server-side, and shared code into dedicated directories. This will improve code organization, make it easier to understand what runs where, and prevent accidental mixing of client/server code.

## Current Structure Issues

- `src/api/` mixes client wrappers and server routes
- `src/lib/` mixes client and server utilities
- `src/services/` is server-side but not clearly marked
- `src/agents/` is server-side but not clearly marked
- No clear separation between client and server code

## Target Structure

```
src/
├── client/                    # All client-side code
│   ├── api/                   # Client API wrappers (HTTP clients)
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── firebase.ts
│   │   ├── github.ts
│   │   ├── projects.ts
│   │   ├── agent.ts
│   │   └── cloudflare.ts
│   ├── components/            # React components
│   │   ├── auth/
│   │   ├── project/
│   │   ├── shared/
│   │   └── ui/
│   ├── routes/                # TanStack Router routes
│   │   ├── __root.tsx
│   │   ├── _app.tsx
│   │   ├── _app.*.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/                 # React hooks
│   │   ├── useCurrentUser.ts
│   │   ├── useGetGithubProjects.ts
│   │   └── use-mobile.ts
│   ├── lib/                   # Client utilities
│   │   ├── auth-client.ts
│   │   ├── firebase.ts
│   │   └── utils.ts
│   ├── integrations/          # Client integrations
│   │   └── tanstack-query/
│   ├── app.tsx                # Client app entry
│   ├── main.tsx                # Client main entry
│   └── router.tsx              # Router setup
├── server/                     # All server-side code
│   ├── api/                    # Express API routes
│   │   ├── routes/             # Route handlers
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── github.ts
│   │   │   ├── firebase.ts
│   │   │   ├── agent.ts
│   │   │   └── cloudflare.ts
│   │   └── server.ts           # Express server setup
│   ├── services/               # Business logic services
│   │   ├── authService.ts
│   │   ├── githubService.ts
│   │   ├── firebaseService.ts
│   │   ├── firebaseHostingService.ts
│   │   └── cloudflareService.ts
│   ├── agents/                 # Server-side agents
│   │   ├── agentExecutor.ts
│   │   └── tools/
│   │       ├── firebaseTools.ts
│   │       ├── githubTools.ts
│   │       └── projectTools.ts
│   └── lib/                    # Server utilities
│       ├── firebase-admin.ts
│       ├── cookies.ts
│       └── encryption.ts
└── shared/                     # Shared code (used by both)
    └── types/                  # TypeScript types
        └── index.ts
```

## File Movement Map

### Client Files (103 .tsx files + 7 .ts files)

#### Client API Wrappers → `client/api/`

- `src/api/client.ts` → `src/client/api/client.ts`
- `src/api/auth.ts` → `src/client/api/auth.ts`
- `src/api/firebase.ts` → `src/client/api/firebase.ts`
- `src/api/github.ts` → `src/client/api/github.ts`
- `src/api/projects.ts` → `src/client/api/projects.ts`
- `src/api/agent.ts` → `src/client/api/agent.ts`
- `src/api/cloudflare.ts` → `src/client/api/cloudflare.ts`

#### Components → `client/components/`

- `src/components/**/*.tsx` → `src/client/components/**/*.tsx` (all 103 .tsx files stay in same structure)

#### Routes → `client/routes/`

- `src/routes/**/*.tsx` → `src/client/routes/**/*.tsx`

#### Contexts → `client/contexts/`

- `src/contexts/AuthContext.tsx` → `src/client/contexts/AuthContext.tsx`

#### Hooks → `client/hooks/`

- `src/hooks/useCurrentUser.ts` → `src/client/hooks/useCurrentUser.ts`
- `src/hooks/useGetGithubProjects.ts` → `src/client/hooks/useGetGithubProjects.ts`
- `src/hooks/use-mobile.ts` → `src/client/hooks/use-mobile.ts`

#### Client Lib → `client/lib/`

- `src/lib/auth-client.ts` → `src/client/lib/auth-client.ts`
- `src/lib/firebase.ts` → `src/client/lib/firebase.ts`
- `src/lib/utils.ts` → `src/client/lib/utils.ts`

#### Integrations → `client/integrations/`

- `src/integrations/tanstack-query/**/*.tsx` → `src/client/integrations/tanstack-query/**/*.tsx`

#### Entry Points → `client/`

- `src/app.tsx` → `src/client/app.tsx`
- `src/main.tsx` → `src/client/main.tsx`
- `src/router.tsx` → `src/client/router.tsx`

### Server Files

#### Server API Routes → `server/api/routes/`

- `src/api/routes/auth.ts` → `src/server/api/routes/auth.ts`
- `src/api/routes/projects.ts` → `src/server/api/routes/projects.ts`
- `src/api/routes/github.ts` → `src/server/api/routes/github.ts`
- `src/api/routes/firebase.ts` → `src/server/api/routes/firebase.ts`
- `src/api/routes/agent.ts` → `src/server/api/routes/agent.ts`
- `src/api/routes/cloudflare.ts` → `src/server/api/routes/cloudflare.ts`

#### Server Setup → `server/api/`

- `src/api/server.ts` → `src/server/api/server.ts`

#### Services → `server/services/`

- `src/services/authService.ts` → `src/server/services/authService.ts`
- `src/services/githubService.ts` → `src/server/services/githubService.ts`
- `src/services/firebaseService.ts` → `src/server/services/firebaseService.ts`
- `src/services/firebaseHostingService.ts` → `src/server/services/firebaseHostingService.ts`
- `src/services/cloudflareService.ts` → `src/server/services/cloudflareService.ts`

#### Agents → `server/agents/`

- `src/agents/agentExecutor.ts` → `src/server/agents/agentExecutor.ts`
- `src/agents/tools/firebaseTools.ts` → `src/server/agents/tools/firebaseTools.ts`
- `src/agents/tools/githubTools.ts` → `src/server/agents/tools/githubTools.ts`
- `src/agents/tools/projectTools.ts` → `src/server/agents/tools/projectTools.ts`

#### Server Lib → `server/lib/`

- `src/lib/firebase-admin.ts` → `src/server/lib/firebase-admin.ts`
- `src/lib/cookies.ts` → `src/server/lib/cookies.ts`
- `src/lib/encryption.ts` → `src/server/lib/encryption.ts`

### Shared Files

#### Types → `shared/types/`

- `src/types/index.ts` → `src/shared/types/index.ts`

## Import Path Updates Required

### Path Alias Updates

The `@/*` alias currently points to `./src/*`. We have two options:

**Option 1: Keep `@/*` pointing to `src/` (Recommended)**

- Update `tsconfig.json` paths to maintain `@/*` → `./src/*`
- All imports will need to be updated to include `client/`, `server/`, or `shared/` prefix
- Example: `@/api/firebase` → `@/client/api/firebase`

**Option 2: Add specific aliases**

- Add `@client/*` → `./src/client/*`
- Add `@server/*` → `./src/server/*`
- Add `@shared/*` → `./src/shared/*`
- Keep `@/*` → `./src/*` for backward compatibility during migration

We'll use **Option 1** for consistency.

### Import Update Categories

#### 1. Client API imports (in client components)

- `@/api/firebase` → `@/client/api/firebase`
- `@/api/github` → `@/client/api/github`
- `@/api/projects` → `@/client/api/projects`
- `@/api/auth` → `@/client/api/auth`
- `@/api/agent` → `@/client/api/agent`
- `@/api/cloudflare` → `@/client/api/cloudflare`
- `@/api/client` → `@/client/api/client`

#### 2. Client lib imports (in client code)

- `@/lib/auth-client` → `@/client/lib/auth-client`
- `@/lib/firebase` → `@/client/lib/firebase`
- `@/lib/utils` → `@/client/lib/utils`

#### 3. Client context/hooks imports

- `@/contexts/AuthContext` → `@/client/contexts/AuthContext`
- `@/hooks/useCurrentUser` → `@/client/hooks/useCurrentUser`
- `@/hooks/useGetGithubProjects` → `@/client/hooks/useGetGithubProjects`
- `@/hooks/use-mobile` → `@/client/hooks/use-mobile`

#### 4. Server route imports (in server routes)

- `@/services/authService` → `@/server/services/authService`
- `@/services/githubService` → `@/server/services/githubService`
- `@/services/firebaseService` → `@/server/services/firebaseService`
- `@/services/firebaseHostingService` → `@/server/services/firebaseHostingService`
- `@/services/cloudflareService` → `@/server/services/cloudflareService`
- `@/lib/firebase-admin` → `@/server/lib/firebase-admin`
- `@/lib/cookies` → `@/server/lib/cookies`
- `@/lib/encryption` → `@/server/lib/encryption`
- `@/agents/agentExecutor` → `@/server/agents/agentExecutor`
- `@/agents/tools/*` → `@/server/agents/tools/*`

#### 5. Shared types imports (everywhere)

- `@/types` → `@/shared/types`

#### 6. Component imports (in client code)

- `@/components/*` → `@/client/components/*`

#### 7. Route imports (in router/app)

- `@/routes/*` → `@/client/routes/*`

## Implementation Steps

### Phase 1: Create New Directory Structure

1. Create `src/client/` directory
2. Create `src/server/` directory
3. Create `src/shared/` directory
4. Create all subdirectories within each

### Phase 2: Move Files (Non-Destructive)

1. Move all client files to `src/client/`
2. Move all server files to `src/server/`
3. Move shared files to `src/shared/`
4. Keep original files temporarily for reference

### Phase 3: Update Imports Systematically

1. Update imports in `src/client/api/client.ts` (base API client)
2. Update imports in all `src/client/api/*.ts` files
3. Update imports in all `src/client/lib/*.ts` files
4. Update imports in all `src/client/components/**/*.tsx` files
5. Update imports in all `src/client/routes/**/*.tsx` files
6. Update imports in all `src/client/contexts/*.tsx` files
7. Update imports in all `src/client/hooks/*.ts` files
8. Update imports in all `src/server/api/routes/*.ts` files
9. Update imports in all `src/server/api/server.ts`
10. Update imports in all `src/server/services/*.ts` files
11. Update imports in all `src/server/agents/**/*.ts` files
12. Update imports in all `src/server/lib/*.ts` files

### Phase 4: Update Configuration Files

1. Update `tsconfig.json` if needed (paths should still work with `@/*` → `./src/*`)
2. Update `vite.config.ts` if needed (should work as-is)
3. Update any build scripts if they reference specific paths
4. Update `package.json` scripts if they reference specific paths

### Phase 5: Update Entry Points

1. Update `src/client/main.tsx` to import from new paths
2. Update `src/client/app.tsx` to import from new paths
3. Update `src/client/router.tsx` to import from new paths
4. Verify entry point in `index.html` or build config

### Phase 6: Testing & Verification

1. Run type checking: `npm run typecheck`
2. Test build: `npm run build`
3. Test dev server: `npm run dev`
4. Verify all imports resolve correctly
5. Test API endpoints work
6. Test client-side functionality

### Phase 7: Cleanup

1. Remove old empty directories
2. Update any documentation
3. Update README if it references file structure

## Special Considerations

### TanStack Router

- Router routes are in `src/client/routes/`
- Router plugin may need to be configured to look in `src/client/routes/` instead of `src/routes/`
- Check `vite.config.ts` for `tanstackRouter` plugin configuration

### Express Server

- Server entry point is `src/server/api/server.ts`
- May need to update how server is started (check `package.json` scripts)
- Ensure server can import from new paths

### Build Configuration

- Vite config should handle the new structure automatically if paths are correct
- TypeScript paths should work with `@/*` alias
- May need to update any hardcoded paths in build scripts

## Risk Assessment

### Low Risk

- Moving files (can be reverted)
- TypeScript will catch import errors immediately

### Medium Risk

- TanStack Router configuration may need updates
- Build scripts may need path updates
- Some dynamic imports might break

### Mitigation

- Keep old files until verification is complete
- Test thoroughly after each phase
- Use git to track changes and allow easy rollback

## Estimated Impact

- **Files to move**: ~140 files
- **Import statements to update**: ~200+ import statements
- **Configuration files to update**: 2-3 files
- **Time estimate**: 2-3 hours for careful migration

## Success Criteria

1. All TypeScript compilation succeeds
2. All imports resolve correctly
3. Dev server starts without errors
4. Build completes successfully
5. All API endpoints work
6. All client-side features work
7. No runtime errors

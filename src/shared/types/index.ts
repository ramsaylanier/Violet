export interface Deployment {
  id: string;
  name: string; // e.g., "Marketing Website", "API", "Client App"
  description?: string;
  repository?: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
  };
  domain?: {
    zoneId?: string;
    zoneName: string;
    provider: "cloudflare" | "firebase";
    linkedAt: Date;
    siteId?: string; // For Firebase domains
    status?: string; // For Firebase domain status
  };
  hosting?: Hosting[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Hosting {
  id: string;
  provider: "cloudflare-pages" | "firebase-hosting";
  name: string;
  url?: string;
  status?: string;
  linkedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type?: "monorepo" | "multi-service";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  settings: ProjectSettings;
  metadata?: Record<string, unknown>;
  // Current fields
  deployments?: Deployment[];
  githubProjects?: Array<{
    projectId: string;
    name: string;
    owner: string;
    ownerType: "user" | "org";
    url?: string;
  }>;
  firebaseProjectId?: string | null;
}

export interface ProjectSettings {
  autoSync: boolean;
  notifications: boolean;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: Array<{ id: number; name: string; color: string }>;
  created_at: string;
  updated_at: string;
  assignees?: Array<{ id: number; login: string; avatar_url?: string }>;
  milestone?: {
    id: number;
    title: string;
    description?: string;
    due_on?: string | null;
    state: "open" | "closed";
  } | null;
  html_url?: string;
  user?: {
    id: number;
    login: string;
    avatar_url?: string;
  };
  comments?: number;
}

export interface GitHubIssueComment {
  id: number;
  body: string;
  user: {
    id: number;
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  html_url?: string;
}

export interface Task {
  id: string;
  projectId: string;
  userId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  type: string;
  input: unknown;
  output?: unknown;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  githubToken?: string; // encrypted reference
  gitlabToken?: string; // encrypted reference
  googleToken?: string; // encrypted reference
  googleRefreshToken?: string; // encrypted reference
  cloudflareToken?: string; // encrypted
}

export interface FirebaseProject {
  projectId: string;
  projectNumber?: string;
  displayName?: string;
  name?: string;
  resources?: {
    hostingSite?: string;
    realtimeDatabaseInstance?: string;
    storageBucket?: string;
    locationId?: string;
  };
}

export interface GitHubProject {
  id: string;
  number: number;
  title: string;
  body?: string | null;
  url: string;
  shortDescription?: string | null;
  closed: boolean;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  public: boolean;
  owner?: {
    id: string;
    login: string;
    type: "User" | "Organization";
  };
  creator?: {
    id: string;
    login: string;
  };
}

export interface GitHubProjectField {
  id: string;
  name: string;
  dataType: "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT" | "ITERATION";
  singleSelectOptions?: Array<{
    id: string;
    name: string;
    nameHTML?: string;
    description?: string | null;
  }>;
}

export interface GitHubProjectItem {
  id: string;
  type: "ISSUE" | "PULL_REQUEST" | "DRAFT_ISSUE";
  content?: {
    id: number;
    number: number;
    title: string;
    body?: string | null;
    state?: "OPEN" | "CLOSED";
    url?: string;
    repository?: {
      name: string;
      owner: {
        login: string;
      };
    };
  } | null;
  fieldValues?: Array<{
    field: {
      id: string;
      name: string;
    };
    value?: string | number | null;
    singleSelectOptionId?: string | null;
    iterationId?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status:
    | "active"
    | "pending"
    | "initializing"
    | "moved"
    | "deleted"
    | "deactivated";
  paused: boolean;
  type: "full" | "partial";
  development_mode: number;
  verification_key?: string;
  created_on: string;
  modified_on: string;
  activated_on?: string;
  owner?: {
    id?: string;
    email?: string;
    type?: string;
  };
  account?: {
    id: string;
    name: string;
  };
  permissions?: string[];
  plan?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    frequency: string;
  };
  plan_pending?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    frequency: string;
  };
  legacy_id?: string;
  legacy_records?: boolean;
  name_servers?: string[];
  original_name_servers?: string[];
  original_registrar?: string;
  original_dnshost?: string;
  modified_on_fmt?: string;
}

export interface CloudflareDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type:
    | "A"
    | "AAAA"
    | "CNAME"
    | "MX"
    | "TXT"
    | "SRV"
    | "SPF"
    | "NS"
    | "PTR"
    | "CAA"
    | "DNSKEY"
    | "DS"
    | "NAPTR"
    | "SMIMEA"
    | "SSHFP"
    | "SVCB"
    | "TLSA"
    | "URI";
  content: string;
  proxiable: boolean;
  proxied?: boolean;
  ttl: number;
  locked: boolean;
  meta?: {
    auto_added?: boolean;
    source?: string;
  };
  comment?: string;
  tags?: string[];
  created_on?: string;
  modified_on?: string;
  priority?: number; // For MX and SRV records
}

export interface CloudflareSSLSetting {
  id: string;
  status: "off" | "flexible" | "full" | "strict";
  method: "http" | "cname" | "txt";
  type: "dv" | "ov" | "ev";
  validation_method: "txt" | "http" | "email";
  validation_errors?: Array<{
    message: string;
  }>;
  hosts?: string[];
  certificates?: Array<{
    id: string;
    hosts: string[];
    issuer: string;
    signature: string;
    status: string;
    bundle_method: string;
    zone_id: string;
    uploaded_on: string;
    modified_on: string;
    expires_on: string;
    priority: number;
  }>;
  certificate_authority?: string;
  cname_target?: string;
  cname_name?: string;
  wildcard?: boolean;
}

export interface CloudflareZoneSetting {
  id: string;
  value: string | number | boolean;
  editable: boolean;
  modified_on?: string;
}

export interface CloudflarePagesProject {
  name: string;
  subdomain?: string;
  domains?: string[];
  source?: {
    type: "github" | "gitlab" | "bitbucket" | "direct_upload";
    config?: {
      owner?: string;
      repo_name?: string;
      production_branch?: string;
      pr_comments_enabled?: boolean;
      deployments_enabled?: boolean;
      production_deployments_enabled?: boolean;
      preview_deployments_enabled?: boolean;
      preview_branch_includes?: string[];
      preview_branch_excludes?: string[];
    };
  };
  build_config?: {
    build_command?: string;
    destination_dir?: string;
    root_dir?: string;
    web_analytics_tag?: string;
    web_analytics_token?: string;
  };
  deployment_configs?: {
    production?: {
      env_vars?: Record<string, string>;
      kv_namespaces?: Record<string, string>;
      durable_object_namespaces?: Record<string, string>;
      r2_buckets?: Record<string, string>;
      compatibility_date?: string;
      compatibility_flags?: string[];
    };
    preview?: {
      env_vars?: Record<string, string>;
      kv_namespaces?: Record<string, string>;
      durable_object_namespaces?: Record<string, string>;
      r2_buckets?: Record<string, string>;
      compatibility_date?: string;
      compatibility_flags?: string[];
    };
  };
  latest_deployment?: CloudflarePagesDeployment;
  created_on?: string;
  production_branch?: string;
}

export interface CloudflarePagesDeployment {
  id: string;
  short_id: string;
  project_id: string;
  project_name: string;
  environment: "production" | "preview";
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage?: {
    name: string;
    started_on?: string;
    ended_on?: string;
    status: "idle" | "active" | "canceled" | "success" | "failure";
  };
  deployment_trigger?: {
    type: "github" | "gitlab" | "bitbucket" | "direct_upload" | "wrangler";
    metadata?: {
      branch?: string;
      commit_hash?: string;
      commit_message?: string;
      commit_dirty?: boolean;
      author?: string;
      author_email?: string;
    };
  };
  stages?: Array<{
    name: string;
    started_on?: string;
    ended_on?: string;
    status: "idle" | "active" | "canceled" | "success" | "failure";
  }>;
  build_config?: {
    build_command?: string;
    destination_dir?: string;
    root_dir?: string;
  };
  env_vars?: Record<string, string>;
  kv_namespaces?: Record<string, string>;
  durable_object_namespaces?: Record<string, string>;
  r2_buckets?: Record<string, string>;
  compatibility_date?: string;
  compatibility_flags?: string[];
}

export interface HostingProvider {
  id: "cloudflare-pages" | "firebase-hosting";
  name: string;
  description: string;
  icon?: string;
}

export interface FirebaseHostingDeployment {
  id: string;
  siteId: string;
  version: string;
  status: "pending" | "in_progress" | "success" | "failure";
  url?: string;
  createdAt: Date;
  completedAt?: Date;
  method: "native" | "api"; // "native" for GitHub, "api" for GitLab
  repository?: {
    owner: string;
    name: string;
    branch: string;
    commit?: string;
    provider: "github" | "gitlab";
  };
}

export interface FirebaseHostingSite {
  name: string;
  siteId: string;
  defaultUrl: string;
  appId?: string;
}

export type DeploymentStep =
  | "idle"
  | "downloading"
  | "building"
  | "deploying"
  | "success"
  | "error";

export interface DeploymentStatus {
  id: string;
  step: DeploymentStep;
  progress: number; // 0-100
  message?: string;
  error?: string;
  deployments?: Array<{
    providerId: string;
    provider: "firebase-hosting" | "cloudflare-pages";
    status: "pending" | "in_progress" | "success" | "error";
    url?: string;
    error?: string;
  }>;
}

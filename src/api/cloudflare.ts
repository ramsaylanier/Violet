/**
 * Client-side Cloudflare API functions
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./client.js";
import type {
  CloudflareZone,
  CloudflareDNSRecord,
  CloudflareSSLSetting,
  CloudflareZoneSetting,
  CloudflarePagesProject,
  CloudflarePagesDeployment
} from "@/types";

/**
 * Store/update Cloudflare API token
 */
export async function storeCloudflareToken(token: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>("/cloudflare/token", { token });
}

/**
 * Remove Cloudflare API token
 */
export async function disconnectCloudflare(): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>("/cloudflare/token");
}

/**
 * List all zones (domains)
 */
export async function listCloudflareZones(): Promise<CloudflareZone[]> {
  return apiGet<CloudflareZone[]>("/cloudflare/zones");
}

/**
 * Get zone details by ID
 */
export async function getCloudflareZone(zoneId: string): Promise<CloudflareZone> {
  return apiGet<CloudflareZone>(`/cloudflare/zones/${encodeURIComponent(zoneId)}`);
}

/**
 * List DNS records for a zone
 */
export async function listCloudflareDNSRecords(
  zoneId: string,
  params?: {
    type?: string;
    name?: string;
    content?: string;
    match?: "all" | "any";
    per_page?: number;
    page?: number;
  }
): Promise<CloudflareDNSRecord[]> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append("type", params.type);
  if (params?.name) queryParams.append("name", params.name);
  if (params?.content) queryParams.append("content", params.content);
  if (params?.match) queryParams.append("match", params.match);
  if (params?.per_page) queryParams.append("per_page", params.per_page.toString());
  if (params?.page) queryParams.append("page", params.page.toString());

  const queryString = queryParams.toString();
  return apiGet<CloudflareDNSRecord[]>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/dns-records${queryString ? `?${queryString}` : ""}`
  );
}

/**
 * Get DNS record by ID
 */
export async function getCloudflareDNSRecord(
  zoneId: string,
  recordId: string
): Promise<CloudflareDNSRecord> {
  return apiGet<CloudflareDNSRecord>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/dns-records/${encodeURIComponent(recordId)}`
  );
}

/**
 * Create DNS record
 */
export async function createCloudflareDNSRecord(
  zoneId: string,
  record: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    priority?: number;
    proxied?: boolean;
    comment?: string;
    tags?: string[];
  }
): Promise<CloudflareDNSRecord> {
  return apiPost<CloudflareDNSRecord>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/dns-records`,
    record
  );
}

/**
 * Update DNS record
 */
export async function updateCloudflareDNSRecord(
  zoneId: string,
  recordId: string,
  updates: {
    type?: string;
    name?: string;
    content?: string;
    ttl?: number;
    priority?: number;
    proxied?: boolean;
    comment?: string;
    tags?: string[];
  }
): Promise<CloudflareDNSRecord> {
  return apiPatch<CloudflareDNSRecord>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/dns-records/${encodeURIComponent(recordId)}`,
    updates
  );
}

/**
 * Delete DNS record
 */
export async function deleteCloudflareDNSRecord(
  zoneId: string,
  recordId: string
): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/dns-records/${encodeURIComponent(recordId)}`
  );
}

/**
 * Get SSL/TLS settings for a zone
 */
export async function getCloudflareSSLSettings(
  zoneId: string
): Promise<CloudflareSSLSetting> {
  return apiGet<CloudflareSSLSetting>(`/cloudflare/zones/${encodeURIComponent(zoneId)}/ssl`);
}

/**
 * Update SSL/TLS settings for a zone
 */
export async function updateCloudflareSSLSettings(
  zoneId: string,
  settings: { enabled: boolean }
): Promise<CloudflareSSLSetting> {
  return apiPatch<CloudflareSSLSetting>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/ssl`,
    settings
  );
}

/**
 * Get zone setting
 */
export async function getCloudflareZoneSetting(
  zoneId: string,
  settingName: string
): Promise<CloudflareZoneSetting> {
  return apiGet<CloudflareZoneSetting>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/settings/${encodeURIComponent(settingName)}`
  );
}

/**
 * Update zone setting
 */
export async function updateCloudflareZoneSetting(
  zoneId: string,
  settingName: string,
  value: string | number | boolean
): Promise<CloudflareZoneSetting> {
  return apiPatch<CloudflareZoneSetting>(
    `/cloudflare/zones/${encodeURIComponent(zoneId)}/settings/${encodeURIComponent(settingName)}`,
    { value }
  );
}

/**
 * Get Cloudflare account ID
 */
export async function getCloudflareAccountId(): Promise<{ accountId: string }> {
  return apiGet<{ accountId: string }>("/cloudflare/account");
}

/**
 * List Cloudflare Pages projects
 */
export async function listCloudflarePagesProjects(
  accountId?: string
): Promise<CloudflarePagesProject[]> {
  const queryString = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return apiGet<CloudflarePagesProject[]>(`/cloudflare/pages/projects${queryString}`);
}

/**
 * Get Cloudflare Pages project details
 */
export async function getCloudflarePagesProject(
  projectName: string,
  accountId?: string
): Promise<CloudflarePagesProject> {
  const queryString = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return apiGet<CloudflarePagesProject>(
    `/cloudflare/pages/projects/${encodeURIComponent(projectName)}${queryString}`
  );
}

/**
 * Create Cloudflare Pages project
 */
export async function createCloudflarePagesProject(data: {
  accountId?: string;
  name: string;
  production_branch?: string;
  build_config?: {
    build_command?: string;
    destination_dir?: string;
    root_dir?: string;
  };
}): Promise<CloudflarePagesProject> {
  return apiPost<CloudflarePagesProject>("/cloudflare/pages/projects", data);
}

/**
 * Delete Cloudflare Pages project
 */
export async function deleteCloudflarePagesProject(
  projectName: string,
  accountId?: string
): Promise<{ success: boolean }> {
  const queryString = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return apiDelete<{ success: boolean }>(
    `/cloudflare/pages/projects/${encodeURIComponent(projectName)}${queryString}`
  );
}

/**
 * List deployments for a Pages project
 */
export async function listCloudflarePagesDeployments(
  projectName: string,
  params?: {
    accountId?: string;
    page?: number;
    per_page?: number;
  }
): Promise<CloudflarePagesDeployment[]> {
  const queryParams = new URLSearchParams();
  if (params?.accountId) queryParams.append("accountId", params.accountId);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.per_page) queryParams.append("per_page", params.per_page.toString());

  const queryString = queryParams.toString();
  return apiGet<CloudflarePagesDeployment[]>(
    `/cloudflare/pages/projects/${encodeURIComponent(projectName)}/deployments${queryString ? `?${queryString}` : ""}`
  );
}

/**
 * Get deployment details
 */
export async function getCloudflarePagesDeployment(
  projectName: string,
  deploymentId: string,
  accountId?: string
): Promise<CloudflarePagesDeployment> {
  const queryString = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return apiGet<CloudflarePagesDeployment>(
    `/cloudflare/pages/projects/${encodeURIComponent(projectName)}/deployments/${encodeURIComponent(deploymentId)}${queryString}`
  );
}

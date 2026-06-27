import { getVersion } from "@tauri-apps/api/app";
import { compareVersions } from "./version";

export type UpdateChannel = "stable" | "beta";

export interface UpdateInfo {
  currentVersion: string;
  availableVersion: string;
  notes?: string;
  pubDate?: string;
}

export interface CheckOptions {
  timeout?: number;
  channel?: UpdateChannel;
}

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/TouHouQing/sub-switch/releases?per_page=1";
const FETCH_TIMEOUT_MS = 15000;

interface GitHubRelease {
  tag_name?: string;
  body?: string;
  published_at?: string;
  prerelease?: boolean;
}

export async function getCurrentVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "";
  }
}

export async function checkForUpdate(
  opts: CheckOptions = {},
): Promise<
  { status: "up-to-date" } | { status: "available"; info: UpdateInfo }
> {
  const currentVersion = await getCurrentVersion();
  const releases = await fetchReleases(opts.timeout ?? FETCH_TIMEOUT_MS);
  const latest = pickLatestRelease(releases);

  if (!latest) {
    return { status: "up-to-date" };
  }

  const availableVersion = normalizeVersion(latest.tag_name ?? "");
  if (!availableVersion || compareVersions(availableVersion, currentVersion) <= 0) {
    return { status: "up-to-date" };
  }

  return {
    status: "available",
    info: {
      currentVersion,
      availableVersion,
      notes: latest.body ?? undefined,
      pubDate: latest.published_at ?? undefined,
    },
  };
}

async function fetchReleases(timeoutMs: number): Promise<GitHubRelease[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "THQ Switch",
      },
    });

    if (!response.ok) {
      return [];
    }

    const releases = (await response.json()) as GitHubRelease[];
    return Array.isArray(releases) ? releases : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function pickLatestRelease(releases: GitHubRelease[]): GitHubRelease | null {
  const latest = releases.find((release) => Boolean(release?.tag_name));
  if (!latest) {
    return null;
  }
  return latest;
}

function normalizeVersion(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

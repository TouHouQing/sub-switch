import { getVersion } from "@tauri-apps/api/app";
import { compareVersions, isUpdateAvailable } from "./version";

export type UpdateChannel = "stable" | "beta";

export interface UpdateInfo {
  currentVersion: string;
  availableVersion: string;
  notes?: string;
  pubDate?: string;
  canInstall?: boolean;
}

export interface CheckOptions {
  timeout?: number;
  channel?: UpdateChannel;
}

export async function getCurrentVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "";
  }
}

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/TouHouQing/sub-switch/releases?per_page=20";

const RELEASE_TAG_RE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

interface GitHubRelease {
  tag_name?: unknown;
  body?: unknown;
  published_at?: unknown;
  draft?: unknown;
}

function normalizeReleaseVersion(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

function pickLatestRelease(releases: GitHubRelease[]): GitHubRelease | null {
  let latest: GitHubRelease | null = null;
  let latestVersion = "";

  for (const release of releases) {
    if (release.draft === true || typeof release.tag_name !== "string") {
      continue;
    }

    const tagName = release.tag_name.trim();
    if (!RELEASE_TAG_RE.test(tagName)) {
      continue;
    }

    const version = normalizeReleaseVersion(tagName);
    if (!latest || compareVersions(version, latestVersion) > 0) {
      latest = release;
      latestVersion = version;
    }
  }

  return latest;
}

async function checkGitHubReleaseFallback(
  currentVersion: string,
): Promise<
  { status: "up-to-date" } | { status: "available"; info: UpdateInfo }
> {
  const response = await fetch(GITHUB_RELEASES_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release check failed with ${response.status}`);
  }

  const releases = (await response.json()) as unknown;
  if (!Array.isArray(releases)) {
    throw new Error("GitHub release check returned an invalid response");
  }

  const latest = pickLatestRelease(releases as GitHubRelease[]);
  if (!latest || typeof latest.tag_name !== "string") {
    return { status: "up-to-date" };
  }

  const availableVersion = normalizeReleaseVersion(latest.tag_name);
  if (!isUpdateAvailable(currentVersion, availableVersion)) {
    return { status: "up-to-date" };
  }

  return {
    status: "available",
    info: {
      currentVersion,
      availableVersion,
      notes: typeof latest.body === "string" ? latest.body : undefined,
      pubDate:
        typeof latest.published_at === "string"
          ? latest.published_at
          : undefined,
      canInstall: false,
    },
  };
}

export async function checkForUpdate(
  opts: CheckOptions = {},
): Promise<
  { status: "up-to-date" } | { status: "available"; info: UpdateInfo }
> {
  const currentVersion = await getCurrentVersion();
  try {
    // 动态引入，避免在未安装插件时导致打包期问题
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check({ timeout: opts.timeout ?? 30000 } as any);

    if (!update) {
      return { status: "up-to-date" };
    }

    const info: UpdateInfo = {
      currentVersion,
      availableVersion: (update as any).version ?? "",
      notes: (update as any).notes ?? (update as any).body,
      pubDate: (update as any).date,
      canInstall: true,
    };

    return { status: "available", info };
  } catch (error) {
    try {
      return await checkGitHubReleaseFallback(currentVersion);
    } catch {
      throw error;
    }
  }
}

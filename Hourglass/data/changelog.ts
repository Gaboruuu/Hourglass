/**
 * Changelog data for the Hourglass app.
 *
 * Each entry represents a release version with its changes.
 * The first entry in the array is always the latest/current version.
 *
 * When adding a new release, insert it at the TOP of the CHANGELOG array.
 */

export type ChangeCategory = "feature" | "fix" | "improvement" | "breaking";
export type ReleaseType = "major" | "minor" | "patch";

export interface ChangeEntry {
  category: ChangeCategory;
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string; // Brief one-liner for the update popup
  type: ReleaseType;
  changes: ChangeEntry[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-08-22",
    title: "Official Alpha Release",
    summary:
      "Hourglass is officially in Alpha! Featuring a brand new changelog system so you never miss an update.",
    type: "major",
    changes: [
      {
        category: "feature",
        description: "In-app changelog — see what's new from Settings",
      },
      {
        category: "feature",
        description:
          "Update popup — brief summary shown once after each update",
      },
      {
        category: "improvement",
        description:
          "Version and build date are now dynamic instead of hardcoded",
      },
      {
        category: "improvement",
        description: "Transitioned from Dev phase to official Alpha 1.0.0",
      },
    ],
  },
];

/**
 * Helper to get the current (latest) version info.
 */
export function getCurrentVersion(): ChangelogEntry {
  return CHANGELOG[0];
}

/**
 * Helper to get a formatted version label.
 */
export function getVersionLabel(): string {
  const current = getCurrentVersion();
  return `Alpha ${current.version}`;
}

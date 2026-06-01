/**
 * Slide-level merge utility.
 *
 * Strategy (last-write-wins at slide block level):
 *  - If local === remote           → no conflict, use either
 *  - If only remote changed        → accept remote
 *  - If only local changed         → keep local
 *  - If both changed independently → conflict: caller shows a diff UI
 */

export type MergeResult =
  | { conflict: false; code: string }
  | { conflict: true; local: string; remote: string };

export function mergeVersions(
  base: string,
  local: string,
  remote: string
): MergeResult {
  if (local === remote) return { conflict: false, code: local };
  if (base === remote) return { conflict: false, code: local };
  if (base === local) return { conflict: false, code: remote };
  return { conflict: true, local, remote };
}

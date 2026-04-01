import type { WorkspaceDescriptor } from "@/store/workspace-store";

export function normalizeWorkspacePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function sanitizeWorkspacePaths(
  paths: string[],
  validWorkspacePaths: Iterable<string>,
): string[] {
  const validRoots = new Set(
    Array.from(validWorkspacePaths, (path) => normalizeWorkspacePath(path)),
  );
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const path of paths) {
    if (typeof path !== "string" || path.trim().length === 0) continue;
    const normalized = normalizeWorkspacePath(path);
    if (!validRoots.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    sanitized.push(normalized);
  }

  return sanitized;
}

export function sanitizeWorkspaceDescriptors(
  descriptors: WorkspaceDescriptor[],
  validWorkspacePaths: Iterable<string>,
): WorkspaceDescriptor[] {
  const validRoots = new Set(
    Array.from(validWorkspacePaths, (path) => normalizeWorkspacePath(path)),
  );

  return descriptors.flatMap((descriptor) => {
    const roots = descriptor.roots
      .filter((root) => typeof root === "string" && root.trim().length > 0)
      .map((root) => normalizeWorkspacePath(root))
      .filter((root, index, list) => validRoots.has(root) && list.indexOf(root) === index);

    if (roots.length === 0) {
      return [];
    }

    return [{
      ...descriptor,
      roots,
    }];
  });
}

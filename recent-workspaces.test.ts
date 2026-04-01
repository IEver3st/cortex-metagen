import { describe, expect, test } from "bun:test";

import {
  sanitizeWorkspaceDescriptors,
  sanitizeWorkspacePaths,
} from "./src/lib/recent-workspaces";
import type { WorkspaceDescriptor } from "./src/store/workspace-store";

describe("recent workspace sanitization", () => {
  test("keeps only existing workspace roots and preserves recency order", () => {
    const recentWorkspaces = [
      "C:/Projects/TahoePPV",
      "C:/Projects/Missing",
      "C:/Projects/TahoePPV/",
      "C:/Projects/Data",
    ];

    expect(
      sanitizeWorkspacePaths(recentWorkspaces, new Set(["C:/Projects/TahoePPV", "C:/Projects/Data"])),
    ).toEqual([
      "C:/Projects/TahoePPV",
      "C:/Projects/Data",
    ]);
  });

  test("drops descriptors whose roots no longer exist", () => {
    const descriptors: WorkspaceDescriptor[] = [
      {
        configPath: "C:/Projects/TahoePPV/.cortex-workspace.json",
        name: "TahoePPV",
        roots: ["C:/Projects/TahoePPV"],
        lastOpenedAt: 5,
        pinned: true,
      },
      {
        configPath: "C:/Projects/Missing/.cortex-workspace.json",
        name: "Missing",
        roots: ["C:/Projects/Missing"],
        lastOpenedAt: 4,
        pinned: false,
      },
      {
        configPath: "C:/Projects/Mixed/.cortex-workspace.json",
        name: "Mixed",
        roots: ["C:/Projects/Missing", "C:/Projects/Data"],
        lastOpenedAt: 3,
        pinned: false,
      },
    ];

    expect(
      sanitizeWorkspaceDescriptors(descriptors, new Set(["C:/Projects/TahoePPV", "C:/Projects/Data"])),
    ).toEqual([
      descriptors[0],
      {
        ...descriptors[2],
        roots: ["C:/Projects/Data"],
      },
    ]);
  });
});

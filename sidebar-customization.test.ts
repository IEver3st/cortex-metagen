import { describe, expect, test } from "bun:test";

import {
  DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE,
  getSidebarItemLabel,
  moveSidebarItem,
  resolveSidebarCustomization,
  setSidebarItemHidden,
  setSidebarItemNickname,
} from "./src/lib/sidebar-customization";

describe("sidebar customization", () => {
  test("normalizes order and keeps only known item IDs", () => {
    const resolved = resolveSidebarCustomization(
      {
        order: ["vehicles", "workspace-toggle", "unknown-item", "handling"],
        hiddenItemIds: ["open-file", "unknown-item"],
        nicknames: {
          vehicles: "Garage",
          "unknown-item": "Ignored",
        },
      },
      null,
    );

    expect(resolved.profile.order.slice(0, 3)).toEqual([
      "vehicles",
      "workspace-toggle",
      "handling",
    ]);
    expect(resolved.hiddenItemIds).toContain("open-file");
    expect(resolved.profile.order).toContain("open-file");
    expect(resolved.profile.order).not.toContain("unknown-item");
    expect(resolved.labels.vehicles).toBe("Garage");
  });

  test("workspace override wins over the global default", () => {
    const resolved = resolveSidebarCustomization(
      {
        ...DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE,
        nicknames: {
          handling: "Tune",
        },
      },
      {
        order: ["meta-merging", "handling", "vehicles"],
        hiddenItemIds: ["workspace-toggle"],
        nicknames: {
          handling: "Per Workspace Tune",
        },
      },
    );

    expect(resolved.usingWorkspaceOverride).toBe(true);
    expect(resolved.visibleItemIds[0]).toBe("meta-merging");
    expect(resolved.labels.handling).toBe("Per Workspace Tune");
    expect(resolved.hiddenItemIds).toContain("workspace-toggle");
  });

  test("move, nickname, and visibility helpers preserve a canonical profile", () => {
    const moved = moveSidebarItem(DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE, "meta-merging", 0);
    expect(moved.order[0]).toBe("meta-merging");

    const renamed = setSidebarItemNickname(moved, "meta-merging", "Merge Lab");
    expect(getSidebarItemLabel("meta-merging", renamed)).toBe("Merge Lab");

    const hidden = setSidebarItemHidden(renamed, "meta-merging", true);
    expect(hidden.hiddenItemIds).toContain("meta-merging");
    expect(hidden.order[hidden.order.length - 1]).toBe("meta-merging");

    const visibleAgain = setSidebarItemHidden(hidden, "meta-merging", false);
    expect(visibleAgain.hiddenItemIds).not.toContain("meta-merging");
    expect(visibleAgain.order.indexOf("meta-merging")).toBeLessThan(
      visibleAgain.order.length - visibleAgain.hiddenItemIds.length,
    );
  });
});

export const SIDEBAR_ITEM_IDS = [
  "workspace-header",
  "workspace-toggle",
  "open-folder",
  "open-file",
  "preset-picker",
  "handling",
  "vehicles",
  "carcols",
  "modkits",
  "carvariations",
  "vehiclelayouts",
  "meta-merging",
] as const;

export type SidebarItemId = (typeof SIDEBAR_ITEM_IDS)[number];

export interface SidebarItemDefinition {
  id: SidebarItemId;
  defaultLabel: string;
  description: string;
}

export interface SidebarCustomizationProfile {
  order: SidebarItemId[];
  hiddenItemIds: SidebarItemId[];
  nicknames: Partial<Record<SidebarItemId, string>>;
}

export interface ResolvedSidebarCustomization {
  profile: SidebarCustomizationProfile;
  visibleItemIds: SidebarItemId[];
  hiddenItemIds: SidebarItemId[];
  labels: Record<SidebarItemId, string>;
  usingWorkspaceOverride: boolean;
}

export const SIDEBAR_ITEM_DEFINITIONS: SidebarItemDefinition[] = [
  {
    id: "workspace-header",
    defaultLabel: "Workspace Header",
    description: "Workspace name and file count banner.",
  },
  {
    id: "workspace-toggle",
    defaultLabel: "Workspace",
    description: "Explorer toggle and workspace file browser entry.",
  },
  {
    id: "open-folder",
    defaultLabel: "Open Folder",
    description: "Open a resource folder.",
  },
  {
    id: "open-file",
    defaultLabel: "Open File",
    description: "Import a single meta or XML file.",
  },
  {
    id: "preset-picker",
    defaultLabel: "Presets",
    description: "Quick preset actions for the active selection.",
  },
  {
    id: "handling",
    defaultLabel: "Handling",
    description: "Open the handling editor.",
  },
  {
    id: "vehicles",
    defaultLabel: "Vehicles",
    description: "Open the vehicles editor.",
  },
  {
    id: "carcols",
    defaultLabel: "Sirens",
    description: "Open the carcols editor.",
  },
  {
    id: "modkits",
    defaultLabel: "ModKits",
    description: "Open the modkits editor.",
  },
  {
    id: "carvariations",
    defaultLabel: "Variations",
    description: "Open the carvariations editor.",
  },
  {
    id: "vehiclelayouts",
    defaultLabel: "Layouts",
    description: "Open the vehicle layouts editor.",
  },
  {
    id: "meta-merging",
    defaultLabel: "Meta Merging",
    description: "Open the metadata merge workflow.",
  },
];

const SIDEBAR_ITEM_ID_SET = new Set<SidebarItemId>(SIDEBAR_ITEM_IDS);

const SIDEBAR_ITEM_DEFAULT_LABELS = SIDEBAR_ITEM_DEFINITIONS.reduce<Record<SidebarItemId, string>>(
  (accumulator, definition) => {
    accumulator[definition.id] = definition.defaultLabel;
    return accumulator;
  },
  {} as Record<SidebarItemId, string>,
);

export const DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE: SidebarCustomizationProfile = {
  order: [...SIDEBAR_ITEM_IDS],
  hiddenItemIds: [],
  nicknames: {},
};

function isSidebarItemId(value: string): value is SidebarItemId {
  return SIDEBAR_ITEM_ID_SET.has(value as SidebarItemId);
}

function uniqueSidebarItemIds(values: Array<string | SidebarItemId>): SidebarItemId[] {
  const seen = new Set<SidebarItemId>();
  const normalized: SidebarItemId[] = [];

  for (const value of values) {
    if (!isSidebarItemId(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

function normalizeNicknames(
  nicknames: Partial<Record<string, string>> | undefined,
): Partial<Record<SidebarItemId, string>> {
  const normalized: Partial<Record<SidebarItemId, string>> = {};

  if (!nicknames) {
    return normalized;
  }

  for (const [itemId, nickname] of Object.entries(nicknames)) {
    if (!isSidebarItemId(itemId) || typeof nickname !== "string") {
      continue;
    }

    const trimmed = nickname.trim();
    if (!trimmed) {
      continue;
    }

    normalized[itemId] = trimmed;
  }

  return normalized;
}

export function normalizeSidebarCustomizationProfile(
  profile: Partial<SidebarCustomizationProfile> | null | undefined,
): SidebarCustomizationProfile {
  const ordered = uniqueSidebarItemIds([
    ...(profile?.order ?? []),
    ...SIDEBAR_ITEM_IDS,
  ]);
  const hiddenItemIds = uniqueSidebarItemIds(profile?.hiddenItemIds ?? []);
  const hiddenSet = new Set(hiddenItemIds);
  const visibleOrder = ordered.filter((itemId) => !hiddenSet.has(itemId));
  const hiddenOrder = ordered.filter((itemId) => hiddenSet.has(itemId));

  return {
    order: [...visibleOrder, ...hiddenOrder],
    hiddenItemIds: hiddenOrder,
    nicknames: normalizeNicknames(profile?.nicknames),
  };
}

export function getSidebarItemDefinition(itemId: SidebarItemId): SidebarItemDefinition {
  return SIDEBAR_ITEM_DEFINITIONS.find((definition) => definition.id === itemId)
    ?? SIDEBAR_ITEM_DEFINITIONS[0];
}

export function getSidebarItemLabel(itemId: SidebarItemId, profile: SidebarCustomizationProfile): string {
  return profile.nicknames[itemId]?.trim() || SIDEBAR_ITEM_DEFAULT_LABELS[itemId];
}

function createSidebarLabels(profile: SidebarCustomizationProfile): Record<SidebarItemId, string> {
  return SIDEBAR_ITEM_IDS.reduce<Record<SidebarItemId, string>>((accumulator, itemId) => {
    accumulator[itemId] = getSidebarItemLabel(itemId, profile);
    return accumulator;
  }, {} as Record<SidebarItemId, string>);
}

export function resolveSidebarCustomization(
  globalProfile: Partial<SidebarCustomizationProfile> | null | undefined,
  workspaceProfile: Partial<SidebarCustomizationProfile> | null | undefined,
): ResolvedSidebarCustomization {
  const normalizedGlobalProfile = normalizeSidebarCustomizationProfile(globalProfile);
  const usingWorkspaceOverride = workspaceProfile !== null && workspaceProfile !== undefined;
  const profile = usingWorkspaceOverride
    ? normalizeSidebarCustomizationProfile(workspaceProfile)
    : normalizedGlobalProfile;

  return {
    profile,
    visibleItemIds: profile.order.filter((itemId) => !profile.hiddenItemIds.includes(itemId)),
    hiddenItemIds: [...profile.hiddenItemIds],
    labels: createSidebarLabels(profile),
    usingWorkspaceOverride,
  };
}

export function moveSidebarItem(
  profile: Partial<SidebarCustomizationProfile> | null | undefined,
  itemId: SidebarItemId,
  nextIndex: number,
): SidebarCustomizationProfile {
  const normalized = normalizeSidebarCustomizationProfile(profile);
  const visibleItemIds = normalized.order.filter((candidate) => !normalized.hiddenItemIds.includes(candidate));
  const hiddenItemIds = normalized.order.filter((candidate) => normalized.hiddenItemIds.includes(candidate));
  const currentIndex = visibleItemIds.indexOf(itemId);

  if (currentIndex === -1) {
    return normalized;
  }

  const reorderedVisibleItemIds = visibleItemIds.filter((candidate) => candidate !== itemId);
  const clampedIndex = Math.max(0, Math.min(nextIndex, reorderedVisibleItemIds.length));
  reorderedVisibleItemIds.splice(clampedIndex, 0, itemId);

  return normalizeSidebarCustomizationProfile({
    ...normalized,
    order: [...reorderedVisibleItemIds, ...hiddenItemIds],
  });
}

export function setSidebarItemHidden(
  profile: Partial<SidebarCustomizationProfile> | null | undefined,
  itemId: SidebarItemId,
  hidden: boolean,
): SidebarCustomizationProfile {
  const normalized = normalizeSidebarCustomizationProfile(profile);
  const hiddenItemIdSet = new Set(normalized.hiddenItemIds);

  if (hidden) {
    hiddenItemIdSet.add(itemId);
  } else {
    hiddenItemIdSet.delete(itemId);
  }

  return normalizeSidebarCustomizationProfile({
    ...normalized,
    order: [...normalized.order.filter((candidate) => candidate !== itemId), itemId],
    hiddenItemIds: [...hiddenItemIdSet],
  });
}

export function setSidebarItemNickname(
  profile: Partial<SidebarCustomizationProfile> | null | undefined,
  itemId: SidebarItemId,
  nickname: string,
): SidebarCustomizationProfile {
  const normalized = normalizeSidebarCustomizationProfile(profile);
  const trimmed = nickname.trim();
  const nextNicknames = { ...normalized.nicknames };

  if (trimmed) {
    nextNicknames[itemId] = trimmed;
  } else {
    delete nextNicknames[itemId];
  }

  return normalizeSidebarCustomizationProfile({
    ...normalized,
    nicknames: nextNicknames,
  });
}

export function resetSidebarItem(
  profile: Partial<SidebarCustomizationProfile> | null | undefined,
  itemId: SidebarItemId,
): SidebarCustomizationProfile {
  const normalized = normalizeSidebarCustomizationProfile(profile);
  const nextNicknames = { ...normalized.nicknames };
  delete nextNicknames[itemId];

  return setSidebarItemHidden(
    {
      ...normalized,
      nicknames: nextNicknames,
    },
    itemId,
    false,
  );
}

import { create } from "zustand";

import {
  DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE,
  normalizeSidebarCustomizationProfile,
  type SidebarCustomizationProfile,
} from "@/lib/sidebar-customization";

const SIDEBAR_CUSTOMIZATION_STORAGE_KEY = "cortex-metagen.sidebar-customization.v1";

interface SidebarCustomizationStore {
  globalProfile: SidebarCustomizationProfile;
  setGlobalProfile: (profile: SidebarCustomizationProfile) => void;
  resetGlobalProfile: () => void;
}

function readStoredProfile(): SidebarCustomizationProfile {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE;
  }

  try {
    const raw = window.localStorage.getItem(SIDEBAR_CUSTOMIZATION_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE;
    }

    const parsed = JSON.parse(raw) as Partial<SidebarCustomizationProfile>;
    return normalizeSidebarCustomizationProfile(parsed);
  } catch {
    return DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE;
  }
}

function persistProfile(profile: SidebarCustomizationProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn("Failed to persist sidebar customization profile:", error);
  }
}

export const useSidebarCustomizationStore = create<SidebarCustomizationStore>((set) => ({
  globalProfile: readStoredProfile(),
  setGlobalProfile: (profile) => {
    const normalized = normalizeSidebarCustomizationProfile(profile);
    persistProfile(normalized);
    set({ globalProfile: normalized });
  },
  resetGlobalProfile: () => {
    persistProfile(DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE);
    set({ globalProfile: DEFAULT_SIDEBAR_CUSTOMIZATION_PROFILE });
  },
}));

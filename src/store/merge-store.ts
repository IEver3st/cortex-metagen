import { create } from "zustand";

import type { MetaFileType } from "@/store/meta-store";
import type { MergeSummary } from "@/lib/meta-merge";

/* ── Types ─────────────────────────────────────────────────────────── */

export type MergeStep = 1 | 2 | 3;
export type DuplicateStrategy = "keep-first" | "keep-last" | "manual";
export type SortStrategy = "preserve" | "alphabetical";

export interface MergeFileEntry {
  path: string;
  name: string;
  content: string;
  detectedType: MetaFileType | null;
  entryCount: number;
  /** Status derived after analysis. */
  status: "parsed" | "error";
  errorMessage?: string;
}

export interface ConflictEntry {
  key: string;
  /** Display-friendly label for the key (e.g. modelName value). */
  keyLabel: string;
  versions: ConflictVersion[];
  resolution: "a" | "b" | "keep-both" | null;
}

export interface ConflictVersion {
  fileIndex: number;
  fileName: string;
  snippet: string;
}

export interface MergeOutputSettings {
  outputPath: string;
  outputFileName: string;
  createBackup: boolean;
  openAfterMerge: boolean;
}

export interface MergeRules {
  duplicateStrategy: DuplicateStrategy;
  sortStrategy: SortStrategy;
  preserveComments: boolean;
  consolidateSimilarHandlingIds: boolean;
}

interface MergeStoreState {
  /* ── Step ─────────────────────────────────────────────────────── */
  step: MergeStep;

  /* ── Files ────────────────────────────────────────────────────── */
  files: MergeFileEntry[];
  detectedType: MetaFileType | null;

  /* ── Analysis ─────────────────────────────────────────────────── */
  summary: MergeSummary | null;
  conflicts: ConflictEntry[];
  previewXml: string;

  /* ── Rules ────────────────────────────────────────────────────── */
  rules: MergeRules;

  /* ── Output ───────────────────────────────────────────────────── */
  output: MergeOutputSettings;

  /* ── UI state ─────────────────────────────────────────────────── */
  isDragOver: boolean;
  isMerging: boolean;
  mergeSuccess: boolean;
  error: string;
  savedPath: string;
}

interface MergeStoreActions {
  /* ── Navigation ───────────────────────────────────────────────── */
  setStep: (step: MergeStep) => void;
  goNext: () => void;
  goBack: () => void;

  /* ── Files ────────────────────────────────────────────────────── */
  addFiles: (files: MergeFileEntry[]) => void;
  removeFile: (path: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  clearFiles: () => void;

  /* ── Analysis ─────────────────────────────────────────────────── */
  setSummary: (summary: MergeSummary | null) => void;
  setConflicts: (conflicts: ConflictEntry[]) => void;
  setPreviewXml: (xml: string) => void;
  resolveConflict: (key: string, resolution: ConflictEntry["resolution"]) => void;
  resolveAllConflicts: (resolution: "a" | "b") => void;

  /* ── Rules ────────────────────────────────────────────────────── */
  setDuplicateStrategy: (strategy: DuplicateStrategy) => void;
  setSortStrategy: (strategy: SortStrategy) => void;
  setPreserveComments: (value: boolean) => void;
  setConsolidateSimilarHandlingIds: (value: boolean) => void;

  /* ── Output ───────────────────────────────────────────────────── */
  setOutputPath: (path: string) => void;
  setOutputFileName: (name: string) => void;
  setCreateBackup: (value: boolean) => void;
  setOpenAfterMerge: (value: boolean) => void;

  /* ── UI ────────────────────────────────────────────────────────── */
  setIsDragOver: (value: boolean) => void;
  setIsMerging: (value: boolean) => void;
  setMergeSuccess: (value: boolean) => void;
  setError: (error: string) => void;
  setSavedPath: (path: string) => void;

  /* ── Reset ────────────────────────────────────────────────────── */
  reset: () => void;
}

export type MergeStore = MergeStoreState & MergeStoreActions;

const DEFAULT_RULES: MergeRules = {
  duplicateStrategy: "keep-last",
  sortStrategy: "preserve",
  preserveComments: true,
  consolidateSimilarHandlingIds: false,
};

const DEFAULT_OUTPUT: MergeOutputSettings = {
  outputPath: "",
  outputFileName: "",
  createBackup: true,
  openAfterMerge: false,
};

const INITIAL_STATE: MergeStoreState = {
  step: 1,
  files: [],
  detectedType: null,
  summary: null,
  conflicts: [],
  previewXml: "",
  rules: { ...DEFAULT_RULES },
  output: { ...DEFAULT_OUTPUT },
  isDragOver: false,
  isMerging: false,
  mergeSuccess: false,
  error: "",
  savedPath: "",
};

export const useMergeStore = create<MergeStore>((set) => ({
  ...INITIAL_STATE,

  /* ── Navigation ───────────────────────────────────────────────── */
  setStep: (step) => set({ step }),
  goNext: () =>
    set((s) => ({ step: Math.min(s.step + 1, 3) as MergeStep })),
  goBack: () =>
    set((s) => ({ step: Math.max(s.step - 1, 1) as MergeStep })),

  /* ── Files ────────────────────────────────────────────────────── */
  addFiles: (incoming) =>
    set((s) => {
      const map = new Map<string, MergeFileEntry>();
      for (const f of s.files) map.set(f.path, f);
      for (const f of incoming) map.set(f.path, f);
      const files = [...map.values()];
      const detectedType = files.find((f) => f.detectedType)?.detectedType ?? null;
      return { files, detectedType, mergeSuccess: false, error: "" };
    }),
  removeFile: (path) =>
    set((s) => {
      const files = s.files.filter((f) => f.path !== path);
      const detectedType = files.find((f) => f.detectedType)?.detectedType ?? null;
      return {
        files,
        detectedType,
        summary: null,
        conflicts: [],
        previewXml: "",
        mergeSuccess: false,
      };
    }),
  reorderFiles: (from, to) =>
    set((s) => {
      const files = [...s.files];
      const [moved] = files.splice(from, 1);
      files.splice(to, 0, moved);
      return { files };
    }),
  clearFiles: () =>
    set({
      files: [],
      detectedType: null,
      summary: null,
      conflicts: [],
      previewXml: "",
      step: 1,
      mergeSuccess: false,
      error: "",
      savedPath: "",
    }),

  /* ── Analysis ─────────────────────────────────────────────────── */
  setSummary: (summary) => set({ summary }),
  setConflicts: (conflicts) => set({ conflicts }),
  setPreviewXml: (xml) => set({ previewXml: xml }),
  resolveConflict: (key, resolution) =>
    set((s) => ({
      conflicts: s.conflicts.map((c) =>
        c.key === key ? { ...c, resolution } : c,
      ),
    })),
  resolveAllConflicts: (resolution) =>
    set((s) => ({
      conflicts: s.conflicts.map((c) => ({ ...c, resolution })),
    })),

  /* ── Rules ────────────────────────────────────────────────────── */
  setDuplicateStrategy: (duplicateStrategy) =>
    set((s) => ({ rules: { ...s.rules, duplicateStrategy } })),
  setSortStrategy: (sortStrategy) =>
    set((s) => ({ rules: { ...s.rules, sortStrategy } })),
  setPreserveComments: (preserveComments) =>
    set((s) => ({ rules: { ...s.rules, preserveComments } })),
  setConsolidateSimilarHandlingIds: (consolidateSimilarHandlingIds) =>
    set((s) => ({ rules: { ...s.rules, consolidateSimilarHandlingIds } })),

  /* ── Output ───────────────────────────────────────────────────── */
  setOutputPath: (outputPath) =>
    set((s) => ({ output: { ...s.output, outputPath } })),
  setOutputFileName: (outputFileName) =>
    set((s) => ({ output: { ...s.output, outputFileName } })),
  setCreateBackup: (createBackup) =>
    set((s) => ({ output: { ...s.output, createBackup } })),
  setOpenAfterMerge: (openAfterMerge) =>
    set((s) => ({ output: { ...s.output, openAfterMerge } })),

  /* ── UI ────────────────────────────────────────────────────────── */
  setIsDragOver: (isDragOver) => set({ isDragOver }),
  setIsMerging: (isMerging) => set({ isMerging }),
  setMergeSuccess: (mergeSuccess) => set({ mergeSuccess }),
  setError: (error) => set({ error }),
  setSavedPath: (savedPath) => set({ savedPath }),

  /* ── Reset ────────────────────────────────────────────────────── */
  reset: () => set({ ...INITIAL_STATE }),
}));

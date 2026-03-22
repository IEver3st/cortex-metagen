import { Fragment, useCallback, useEffect, useMemo, useState, type DragEventHandler, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  Files,
  FilePlus2,
  FolderPlus,
  Trash2,
  ChevronRight,
  Check,
  AlertTriangle,
  GripVertical,
  FileCode2,
  ArrowDownUp,
  Shield,
  Download,
  X,
  Sparkles,
  Eye,
  GitCompare,
  Settings2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useMergeStore, type MergeStore, type MergeStep, type MergeFileEntry, type MergeRules, type MergeOutputSettings, type ConflictEntry, type DuplicateStrategy, type SortStrategy } from "@/store/merge-store";
import {
  mergeMetaFiles,
  analyzeFiles,
  analyzeOneFile,
  previewSimilarHandlingIds,
  type MergeSummary,
} from "@/lib/meta-merge";
import type { MetaFileType } from "@/store/meta-store";

/* ── Constants ─────────────────────────────────────────────────────── */

const META_TYPE_LABELS: Record<MetaFileType, string> = {
  handling: "Handling",
  vehicles: "Vehicles",
  carcols: "Sirens",
  carvariations: "Variations",
  vehiclelayouts: "Layouts",
  modkits: "ModKits",
};

const SUPPORTED_TYPES: MetaFileType[] = [
  "vehicles",
  "handling",
  "carcols",
  "carvariations",
  "vehiclelayouts",
];

const STEP_LABELS: Record<MergeStep, string> = {
  1: "Add Files",
  2: "Review",
  3: "Merge & Save",
};

/* ── Animations ────────────────────────────────────────────────────── */

const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } };
const SLIDE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

/* ── Main Component ────────────────────────────────────────────────── */

export function MetaMergingView() {
  const store = useMergeStore();
  const { step, files, detectedType, summary, conflicts, previewXml, rules, output, isDragOver, isMerging, mergeSuccess, error, savedPath } = store;
  const { setSummary, setConflicts, setPreviewXml, setError: setStoreError } = store;

  const canMerge = files.length >= 2 && files.every((f) => f.status === "parsed");
  const canAdvanceToReview = canMerge;
  const hasUnresolvedConflicts = conflicts.some((c) => c.resolution === null);
  const canMergeAndSave = canMerge && (rules.duplicateStrategy !== "manual" || !hasUnresolvedConflicts);

  /* ── Handling ID prompt ─────────────────────────────────────────── */
  const [similarHandlingPromptOpen, setSimilarHandlingPromptOpen] = useState(false);
  const [similarHandlingPairs, setSimilarHandlingPairs] = useState<string[]>([]);

  /* ── Load files from paths ──────────────────────────────────────── */
  const loadFilesFromPaths = useCallback(async (paths: string[]) => {
    store.setError("");
    const entries: MergeFileEntry[] = [];

    for (const filePath of paths) {
      try {
        const content = await invoke<string>("read_meta_file", { path: filePath });
        const analysis = analyzeOneFile(filePath, content);
        entries.push({
          path: filePath,
          name: filePath.split(/[/\\]/).pop() ?? filePath,
          content,
          detectedType: analysis.detectedType,
          entryCount: analysis.entryCount,
          status: analysis.error ? "error" : "parsed",
          errorMessage: analysis.error ?? undefined,
        });
      } catch (err) {
        entries.push({
          path: filePath,
          name: filePath.split(/[/\\]/).pop() ?? filePath,
          content: "",
          detectedType: null,
          entryCount: 0,
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }

    store.addFiles(entries);
  }, [store]);

  /* ── File handlers ──────────────────────────────────────────────── */
  const handleSelectFiles = useCallback(async () => {
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: "Meta/XML", extensions: ["meta", "xml"] }],
      title: "Select Meta Files to Merge",
    });
    if (!selected) return;
    const list = Array.isArray(selected) ? selected : [selected];
    await loadFilesFromPaths(list);
  }, [loadFilesFromPaths]);

  const handleSelectFolder = useCallback(async () => {
    const selected = await openDialog({
      directory: true,
      title: "Select Folder Containing Meta Files",
    });
    if (!selected || Array.isArray(selected)) return;

    try {
      const folderFiles = await invoke<string[]>("list_workspace_meta_files", { path: selected });
      if (folderFiles.length === 0) {
        store.setError("No .meta or .xml files found in the selected folder.");
        return;
      }
      await loadFilesFromPaths(folderFiles);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : String(err));
    }
  }, [loadFilesFromPaths, store]);

  const handleDrop: DragEventHandler<HTMLDivElement> = useCallback(async (event) => {
    event.preventDefault();
    store.setIsDragOver(false);

    const dropped = [...(event.dataTransfer.files ?? [])] as Array<File & { path?: string }>;
    const paths = dropped
      .map((f) => f.path)
      .filter((p): p is string => Boolean(p && /\.(meta|xml)$/i.test(p)));

    if (paths.length === 0) return;
    await loadFilesFromPaths(paths);
  }, [loadFilesFromPaths, store]);

  /* ── Review step: analyze on enter ──────────────────────────────── */
  useEffect(() => {
    if (step !== 2 || files.length < 2) return;

    try {
      const inputs = files
        .filter((f) => f.status === "parsed")
        .map((f) => ({ path: f.path, content: f.content }));

      const result = analyzeFiles(inputs, {
        consolidateSimilarHandlingIds: rules.consolidateSimilarHandlingIds,
        duplicateStrategy: rules.duplicateStrategy,
        sortStrategy: rules.sortStrategy,
      });

      setSummary(result.summary);
      setConflicts(
        result.conflicts.map((c) => ({
          key: c.key,
          keyLabel: c.keyLabel,
          versions: c.versions,
          resolution: rules.duplicateStrategy === "keep-first" ? "a" : rules.duplicateStrategy === "keep-last" ? "b" : null,
        })),
      );
      setPreviewXml(result.previewXml);
      setStoreError("");
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : String(err));
    }
  }, [step, files, rules.consolidateSimilarHandlingIds, rules.duplicateStrategy, rules.sortStrategy, setSummary, setConflicts, setPreviewXml, setStoreError]);

  /* ── Merge & Save ───────────────────────────────────────────────── */
  const executeMerge = useCallback(async (consolidateHandling: boolean) => {
    store.setError("");
    store.setIsMerging(true);

    try {
      const inputs = files
        .filter((f) => f.status === "parsed")
        .map((f) => ({ path: f.path, content: f.content }));

      const result = mergeMetaFiles(inputs, {
        consolidateSimilarHandlingIds: consolidateHandling,
        duplicateStrategy: rules.duplicateStrategy,
        sortStrategy: rules.sortStrategy,
      });

      const defaultName = output.outputFileName || `${result.summary.type}.merged.meta`;

      const targetPath = await saveDialog({
        title: "Save merged meta",
        defaultPath: defaultName,
        filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
      });

      if (!targetPath) {
        store.setIsMerging(false);
        return;
      }

      await invoke("write_meta_file", { path: targetPath, content: result.xml });
      store.setSummary(result.summary);
      store.setPreviewXml(result.xml);
      store.setMergeSuccess(true);
      store.setSavedPath(targetPath);
      store.setStep(3);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : String(err));
    } finally {
      store.setIsMerging(false);
    }
  }, [files, rules, output, store]);

  const handleMergeAndSave = useCallback(async () => {
    const inputs = files
      .filter((f) => f.status === "parsed")
      .map((f) => ({ path: f.path, content: f.content }));

    const similarPairs = previewSimilarHandlingIds(inputs);
    if (similarPairs.length > 0 && !rules.consolidateSimilarHandlingIds) {
      setSimilarHandlingPairs(similarPairs);
      setSimilarHandlingPromptOpen(true);
      return;
    }

    await executeMerge(rules.consolidateSimilarHandlingIds);
  }, [files, rules, executeMerge]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#040d1a]">
      {/* ── Stepper Bar ────────────────────────────────────────── */}
      <StepperBar step={step} onStepClick={(s) => { if (s < step || (s === 2 && canAdvanceToReview)) store.setStep(s); }} canReview={canAdvanceToReview} mergeSuccess={mergeSuccess} />

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step-1" {...SLIDE_UP} className="h-full flex">
              {/* Left Pane: File List */}
              <div className="w-[340px] min-w-[280px] border-r border-[#131a2b] flex flex-col">
                <FilesPane
                  files={files}
                  isDragOver={isDragOver}
                  onSelectFiles={handleSelectFiles}
                  onSelectFolder={handleSelectFolder}
                  onRemoveFile={store.removeFile}
                  onClearAll={store.clearFiles}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); store.setIsDragOver(true); }}
                  onDragLeave={() => store.setIsDragOver(false)}
                  detectedType={detectedType}
                />
              </div>

              {/* Right Pane: Empty / Preview */}
              <div className="flex-1 overflow-hidden">
                {files.length === 0 ? (
                  <EmptyDropzone
                    isDragOver={isDragOver}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); store.setIsDragOver(true); }}
                    onDragLeave={() => store.setIsDragOver(false)}
                    onSelectFiles={handleSelectFiles}
                    onSelectFolder={handleSelectFolder}
                  />
                ) : (
                  <QuickSummaryPane files={files} detectedType={detectedType} />
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-2" {...SLIDE_UP} className="h-full flex">
              {/* Left Pane: Merge Rules + Output */}
              <div className="w-[340px] min-w-[280px] border-r border-[#131a2b] flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-5">
                    <MergeRulesPanel
                      rules={rules}
                      detectedType={detectedType}
                      onSetDuplicateStrategy={store.setDuplicateStrategy}
                      onSetSortStrategy={store.setSortStrategy}
                      onSetPreserveComments={store.setPreserveComments}
                      onSetConsolidateHandling={store.setConsolidateSimilarHandlingIds}
                    />

                    <Separator className="bg-[#131a2b]" />

                    <OutputSettingsPanel
                      output={output}
                      detectedType={detectedType}
                      onSetFileName={store.setOutputFileName}
                      onSetCreateBackup={store.setCreateBackup}
                      onSetOpenAfterMerge={store.setOpenAfterMerge}
                    />
                  </div>
                </ScrollArea>
              </div>

              {/* Right Pane: Summary + Conflicts + Preview */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {summary && <MergeSummaryCard summary={summary} />}

                {error && (
                  <motion.div {...FADE_IN} className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-400 flex items-start gap-2">
                    <XCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="flex-1 overflow-hidden">
                  <ReviewTabs
                    conflicts={conflicts}
                    previewXml={previewXml}
                    onResolveConflict={store.resolveConflict}
                    onResolveAll={store.resolveAllConflicts}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step-3" {...SLIDE_UP} className="h-full flex items-center justify-center">
              <SuccessView
                summary={summary}
                savedPath={savedPath}
                onReset={store.reset}
                onStartNew={() => { store.reset(); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sticky Action Bar ──────────────────────────────────── */}
      {step < 3 && (
        <StickyActionBar
          step={step}
          files={files}
          conflicts={conflicts}
          canAdvance={step === 1 ? canAdvanceToReview : canMergeAndSave}
          isMerging={isMerging}
          error={error}
          onBack={store.goBack}
          onNext={() => {
            if (step === 1) {
              store.setStep(2);
            } else {
              void handleMergeAndSave();
            }
          }}
        />
      )}

      {/* ── Similar Handling IDs Dialog ─────────────────────────── */}
      <AlertDialog open={similarHandlingPromptOpen} onOpenChange={setSimilarHandlingPromptOpen}>
        <AlertDialogContent className="border-[#1e2d45] bg-[#0a1628]">
          <AlertDialogHeader>
            <AlertDialogTitle>Similar Handling IDs Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Similar handling IDs were found (e.g. variant suffixes). Consolidate to one canonical ID per group?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-40 overflow-auto rounded-lg border border-[#1e2d45] bg-[#060e1f] p-3 text-xs font-mono space-y-1">
            {similarHandlingPairs.slice(0, 8).map((pair) => (
              <div key={pair} className="text-slate-400">{pair}</div>
            ))}
            {similarHandlingPairs.length > 8 && (
              <div className="text-slate-600">+{similarHandlingPairs.length - 8} more...</div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-[#1e2d45] bg-transparent text-slate-300 hover:bg-[#111d33]"
              onClick={() => { void executeMerge(false); }}
            >
              Keep Separate
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void executeMerge(true); }}
            >
              Consolidate IDs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* We need React for the useState in the main component */
import React from "react";


/* ═══════════════════════════════════════════════════════════════════ *
 *  SUB-COMPONENTS                                                     *
 * ═══════════════════════════════════════════════════════════════════ */


/* ── Stepper Bar ───────────────────────────────────────────────────── */

function StepperBar({ step, onStepClick, canReview, mergeSuccess }: {
  step: MergeStep;
  onStepClick: (s: MergeStep) => void;
  canReview: boolean;
  mergeSuccess: boolean;
}) {
  const steps: MergeStep[] = [1, 2, 3];

  return (
    <div className="border-b border-[#131a2b] bg-[#050d21]/80 backdrop-blur-sm px-6 py-3 flex items-center gap-1">
      {steps.map((s, i) => {
        const isActive = step === s;
        const isComplete = step > s || (s === 3 && mergeSuccess);
        const isClickable = s < step || (s === 2 && canReview && step >= 1) || (s === 1);
        const isDisabled = s === 3 && !mergeSuccess && step !== 3;

        return (
          <Fragment key={s}>
            {i > 0 && (
              <div className={cn(
                "flex-1 h-px max-w-12 mx-1 transition-colors duration-300",
                isComplete || isActive ? "bg-primary/50" : "bg-[#1e2d45]",
              )} />
            )}
            <button
              type="button"
              disabled={!isClickable || isDisabled}
              onClick={() => isClickable && onStepClick(s)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                isActive && "bg-[#0c1a2e] border border-primary/30 text-primary shadow-[0_0_12px_rgba(100,200,255,0.06)]",
                isComplete && !isActive && "text-primary/80",
                !isActive && !isComplete && !isDisabled && "text-slate-500 hover:text-slate-400",
                isDisabled && "text-slate-600 cursor-not-allowed opacity-50",
              )}
            >
              <span className={cn(
                "flex items-center justify-center size-5 rounded-full text-[10px] font-bold border transition-all",
                isActive && "border-primary/50 bg-primary/10 text-primary",
                isComplete && !isActive && "border-primary/40 bg-primary/20 text-primary",
                !isActive && !isComplete && "border-[#2a3f60] bg-transparent text-slate-500",
              )}>
                {isComplete && !isActive ? <Check className="size-3" /> : s}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}


/* ── Files Pane (Left) ─────────────────────────────────────────────── */

function FilesPane({ files, isDragOver, onSelectFiles, onSelectFolder, onRemoveFile, onClearAll, onDrop, onDragOver, onDragLeave, detectedType }: {
  files: MergeFileEntry[];
  isDragOver: boolean;
  onSelectFiles: () => void;
  onSelectFolder: () => void;
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: () => void;
  detectedType: MetaFileType | null;
}) {
  return (
    <div
      className={cn(
        "h-full flex flex-col transition-colors duration-200",
        isDragOver && "bg-primary/5",
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Controls */}
      <div className="p-3 space-y-2 border-b border-[#131a2b]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input Files</h3>
          {files.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs border-[#1e2d45] bg-[#0a1628] hover:bg-[#111d33] text-slate-300"
            onClick={onSelectFiles}
          >
            <FilePlus2 className="size-3.5" /> Add Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs border-[#1e2d45] bg-[#0a1628] hover:bg-[#111d33] text-slate-300"
            onClick={onSelectFolder}
          >
            <FolderPlus className="size-3.5" /> Add Folder
          </Button>
        </div>
      </div>

      {/* File list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence initial={false}>
            {files.map((file, index) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -12, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <FileRow file={file} index={index} onRemove={() => onRemoveFile(file.path)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {files.length === 0 && (
            <div className="py-8 text-center">
              <FileCode2 className="size-8 mx-auto mb-3 text-slate-700" />
              <p className="text-xs text-slate-500">No files added yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Drop files or use the buttons above</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-[#131a2b] text-[10px] text-slate-500 flex items-center gap-3">
          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
          {detectedType && (
            <>
              <span className="text-[#1e2d45]">|</span>
              <span className="text-primary/70">{META_TYPE_LABELS[detectedType]}</span>
            </>
          )}
          <span className="text-[#1e2d45]">|</span>
          <span>{files.reduce((sum, f) => sum + f.entryCount, 0)} entries</span>
        </div>
      )}
    </div>
  );
}


/* ── File Row ──────────────────────────────────────────────────────── */

function FileRow({ file, index, onRemove }: { file: MergeFileEntry; index: number; onRemove: () => void }) {
  const isError = file.status === "error";

  return (
    <div className={cn(
      "group relative rounded-lg border px-3 py-2 transition-all duration-150",
      isError
        ? "border-red-500/20 bg-red-950/10"
        : "border-[#1a2740] bg-[#0a1628]/60 hover:bg-[#0e1d35] hover:border-[#1e3050]",
    )}>
      <div className="flex items-start gap-2">
        <GripVertical className="size-3.5 text-slate-700 mt-0.5 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>

            {file.detectedType && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#111d33] border border-[#1e2d45] text-slate-400">
                {META_TYPE_LABELS[file.detectedType]}
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-600 truncate mt-0.5">{file.path}</p>

          <div className="flex items-center gap-2 mt-1">
            {file.entryCount > 0 && (
              <span className="text-[10px] text-slate-500">
                {file.entryCount} {file.detectedType === "vehicles" ? "vehicle" : file.detectedType === "handling" ? "handling" : "entr"}{file.entryCount !== 1 ? (file.detectedType === "vehicles" || file.detectedType === "handling" ? "s" : "ies") : (file.detectedType === "vehicles" || file.detectedType === "handling" ? "" : "y")}
              </span>
            )}

            {isError ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                <XCircle className="size-3" /> {file.errorMessage ?? "Error"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500/60">
                <CheckCircle2 className="size-3" /> parsed
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="size-6 flex items-center justify-center rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}


/* ── Empty Dropzone ────────────────────────────────────────────────── */

function EmptyDropzone({ isDragOver, onDrop, onDragOver, onDragLeave, onSelectFiles, onSelectFolder }: {
  isDragOver: boolean;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: () => void;
  onSelectFiles: () => void;
  onSelectFolder: () => void;
}) {
  return (
    <div
      className={cn(
        "h-full flex flex-col items-center justify-center p-8 transition-all duration-300",
        isDragOver && "bg-primary/[0.03]",
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <motion.div
        className="text-center max-w-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Animated icon */}
        <motion.div
          className={cn(
            "mx-auto size-20 rounded-2xl border-2 border-dashed flex items-center justify-center mb-6 transition-all duration-300",
            isDragOver
              ? "border-primary/50 bg-primary/5 scale-110"
              : "border-[#1e2d45] bg-[#0a1628]/40",
          )}
          animate={isDragOver ? { scale: 1.08, borderColor: "rgba(100,200,255,0.5)" } : { scale: 1 }}
        >
          <Files className={cn(
            "size-8 transition-colors",
            isDragOver ? "text-primary" : "text-slate-600",
          )} />
        </motion.div>

        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {isDragOver ? "Drop files here" : "Drop meta files to merge"}
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Merge multiple meta files of the same type into one clean output.
        </p>

        {/* Type chips */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {SUPPORTED_TYPES.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-[#0c1a2e] border border-[#1a2740] text-slate-500"
            >
              {META_TYPE_LABELS[type]}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#1e2d45] bg-[#0a1628] hover:bg-[#111d33] text-slate-300"
            onClick={onSelectFiles}
          >
            <FilePlus2 className="size-4" /> Add Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#1e2d45] bg-[#0a1628] hover:bg-[#111d33] text-slate-300"
            onClick={onSelectFolder}
          >
            <FolderPlus className="size-4" /> Add Folder
          </Button>
        </div>

        <p className="text-[10px] text-slate-600 mt-4">
          Example: merge multiple <span className="text-slate-400">vehicles.meta</span> files into one.
        </p>
      </motion.div>
    </div>
  );
}


/* ── Quick Summary Pane (Step 1, right side when files present) ──── */

function QuickSummaryPane({ files, detectedType }: { files: MergeFileEntry[]; detectedType: MetaFileType | null }) {
  const totalEntries = files.reduce((sum, f) => sum + f.entryCount, 0);
  const parsedCount = files.filter((f) => f.status === "parsed").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <motion.div
        className="max-w-md w-full space-y-6"
        {...SLIDE_UP}
      >
        <div className="text-center mb-2">
          <Shield className="size-10 mx-auto mb-3 text-primary/40" />
          <h3 className="text-lg font-semibold text-slate-200">Ready to Review</h3>
          <p className="text-sm text-slate-500 mt-1">Your files are loaded. Proceed to review merge options.</p>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Files" value={String(files.length)} sublabel={`${parsedCount} parsed`} icon={<Files className="size-4" />} />
          <StatCard label="Type" value={detectedType ? META_TYPE_LABELS[detectedType] : "Mixed"} sublabel={detectedType ? `${detectedType}.meta` : "Select same type"} icon={<FileCode2 className="size-4" />} color={detectedType ? "primary" : "warning"} />
          <StatCard label="Total Entries" value={String(totalEntries)} sublabel="across all files" icon={<ArrowDownUp className="size-4" />} />
          <StatCard label="Status" value={errorCount > 0 ? `${errorCount} error${errorCount !== 1 ? "s" : ""}` : "All valid"} sublabel={errorCount > 0 ? "Fix errors to continue" : "Ready to merge"} icon={errorCount > 0 ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />} color={errorCount > 0 ? "error" : "success"} />
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, sublabel, icon, color = "default" }: {
  label: string;
  value: string;
  sublabel: string;
  icon: ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "error";
}) {
  const colorMap = {
    default: "text-slate-400 border-[#1a2740]",
    primary: "text-primary border-primary/20",
    success: "text-emerald-400 border-emerald-500/20",
    warning: "text-amber-400 border-amber-500/20",
    error: "text-red-400 border-red-500/20",
  };

  return (
    <div className={cn("rounded-lg border bg-[#0a1628]/60 p-3 space-y-1", colorMap[color])}>
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-200">{value}</p>
      <p className="text-[10px] text-slate-600">{sublabel}</p>
    </div>
  );
}


/* ── Merge Summary Card (Step 2) ───────────────────────────────────── */

function MergeSummaryCard({ summary }: { summary: MergeSummary }) {
  const stats = [
    { label: "Type", value: META_TYPE_LABELS[summary.type] ?? summary.type },
    { label: "Files", value: String(summary.inputFiles) },
    { label: "Total Entries", value: String(summary.parsedEntries) },
    { label: "Unique Keys", value: String(summary.uniqueEntries) },
    { label: "Duplicates", value: String(summary.duplicatesRemoved), highlight: summary.duplicatesRemoved > 0 },
    { label: "Conflicts", value: String(summary.conflictsDetected), warn: summary.conflictsDetected > 0 },
    { label: "Comments", value: summary.preservedComments > 0 ? `${summary.preservedComments} kept` : "None" },
    ...(summary.handlingIdConsolidations > 0 ? [{ label: "Consolidated", value: String(summary.handlingIdConsolidations) }] : []),
  ];

  return (
    <motion.div {...FADE_IN} className="mx-4 mt-4 rounded-lg border border-[#1a2740] bg-[#0a1628]/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary/60" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Merge Summary</h3>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
            <span className={cn(
              "text-sm font-bold",
              "warn" in s && s.warn ? "text-amber-400" : "highlight" in s && s.highlight ? "text-primary/80" : "text-slate-200",
            )}>{s.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}


/* ── Merge Rules Panel (Step 2, Left) ──────────────────────────────── */

function MergeRulesPanel({ rules, detectedType, onSetDuplicateStrategy, onSetSortStrategy, onSetPreserveComments, onSetConsolidateHandling }: {
  rules: MergeRules;
  detectedType: MetaFileType | null;
  onSetDuplicateStrategy: (s: DuplicateStrategy) => void;
  onSetSortStrategy: (s: SortStrategy) => void;
  onSetPreserveComments: (v: boolean) => void;
  onSetConsolidateHandling: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-slate-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Merge Rules</h3>
      </div>

      {/* Key field */}
      {detectedType && (
        <div className="rounded-lg border border-[#1a2740] bg-[#0a1628]/60 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Key Field (Auto-Detected)</p>
          <p className="text-xs text-slate-300 font-mono">
            {detectedType === "vehicles" ? "modelName" :
             detectedType === "handling" ? "handlingName" :
             detectedType === "carcols" ? "sirenId / kitId" :
             detectedType === "carvariations" ? "modelName" :
             detectedType === "vehiclelayouts" ? "layoutName" :
             "name"}
          </p>
        </div>
      )}

      {/* Duplicate handling */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Duplicate Handling</p>
        <div className="space-y-1">
          {([
            { value: "keep-first" as const, label: "Keep first occurrence" },
            { value: "keep-last" as const, label: "Keep last occurrence" },
            { value: "manual" as const, label: "Manually resolve conflicts" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSetDuplicateStrategy(opt.value)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                rules.duplicateStrategy === opt.value
                  ? "bg-primary/10 border border-primary/25 text-primary"
                  : "bg-[#0a1628]/40 border border-transparent text-slate-400 hover:bg-[#0e1d35] hover:text-slate-300",
              )}
            >
              <div className={cn(
                "size-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                rules.duplicateStrategy === opt.value ? "border-primary" : "border-slate-600",
              )}>
                {rules.duplicateStrategy === opt.value && <div className="size-1.5 rounded-full bg-primary" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div className="space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Sorting</p>
        <div className="space-y-1">
          {([
            { value: "preserve" as const, label: "Preserve original order" },
            { value: "alphabetical" as const, label: "Sort alphabetically by key" },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSetSortStrategy(opt.value)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                rules.sortStrategy === opt.value
                  ? "bg-primary/10 border border-primary/25 text-primary"
                  : "bg-[#0a1628]/40 border border-transparent text-slate-400 hover:bg-[#0e1d35] hover:text-slate-300",
              )}
            >
              <div className={cn(
                "size-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                rules.sortStrategy === opt.value ? "border-primary" : "border-slate-600",
              )}>
                {rules.sortStrategy === opt.value && <div className="size-1.5 rounded-full bg-primary" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400 flex items-center gap-2">
            <MessageSquare className="size-3.5 text-slate-500" />
            Preserve inline comments
          </Label>
          <Switch checked={rules.preserveComments} onCheckedChange={onSetPreserveComments} size="sm" />
        </div>

        {(detectedType === "vehicles" || !detectedType) && (
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-slate-400 flex items-center gap-2">
              <GitCompare className="size-3.5 text-slate-500" />
              Consolidate similar handling IDs
            </Label>
            <Switch checked={rules.consolidateSimilarHandlingIds} onCheckedChange={onSetConsolidateHandling} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Output Settings Panel ─────────────────────────────────────────── */

function OutputSettingsPanel({ output, detectedType, onSetFileName, onSetCreateBackup, onSetOpenAfterMerge }: {
  output: MergeOutputSettings;
  detectedType: MetaFileType | null;
  onSetFileName: (name: string) => void;
  onSetCreateBackup: (v: boolean) => void;
  onSetOpenAfterMerge: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Download className="size-4 text-slate-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Output Settings</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Output Filename</Label>
        <Input
          placeholder={detectedType ? `${detectedType}.merged.meta` : "merged.meta"}
          value={output.outputFileName}
          onChange={(e) => onSetFileName(e.target.value)}
          className="h-8 text-xs bg-[#0a1628] border-[#1e2d45] text-slate-300 placeholder:text-slate-600"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400">Create backup of overwritten file</Label>
          <Switch checked={output.createBackup} onCheckedChange={onSetCreateBackup} size="sm" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-slate-400">Open output after merge</Label>
          <Switch checked={output.openAfterMerge} onCheckedChange={onSetOpenAfterMerge} size="sm" />
        </div>
      </div>
    </div>
  );
}


/* ── Review Tabs (Conflicts + Preview) ─────────────────────────────── */

function ReviewTabs({ conflicts, previewXml, onResolveConflict, onResolveAll }: {
  conflicts: ConflictEntry[];
  previewXml: string;
  onResolveConflict: (key: string, resolution: "a" | "b" | "keep-both" | null) => void;
  onResolveAll: (resolution: "a" | "b") => void;
}) {
  return (
    <Tabs defaultValue="preview" className="h-full flex flex-col p-4 pt-3">
      <TabsList variant="line" className="mb-3 border-b border-[#1a2740]">
        <TabsTrigger value="preview" className="gap-1.5 text-xs">
          <Eye className="size-3.5" /> Merged Preview
        </TabsTrigger>
        <TabsTrigger value="conflicts" className="gap-1.5 text-xs">
          <AlertTriangle className="size-3.5" />
          Conflicts
          {conflicts.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400">
              {conflicts.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="preview" className="flex-1 overflow-hidden">
        <PreviewPane xml={previewXml} />
      </TabsContent>

      <TabsContent value="conflicts" className="flex-1 overflow-hidden">
        <ConflictsPane
          conflicts={conflicts}
          onResolveConflict={onResolveConflict}
          onResolveAll={onResolveAll}
        />
      </TabsContent>
    </Tabs>
  );
}


/* ── Preview Pane (XML) ────────────────────────────────────────────── */

function PreviewPane({ xml }: { xml: string }) {
  const lines = useMemo(() => xml.split("\n"), [xml]);
  const lineCount = lines.length;

  if (!xml) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-xs">
        No preview available yet
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-[#1a2740] bg-[#060e1f] overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-[#1a2740] flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Merged Output</span>
        <span className="text-[10px] text-slate-600">{lineCount} lines</span>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-3 text-[11px] leading-relaxed text-slate-400 font-mono whitespace-pre overflow-x-auto">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-right text-slate-700 w-10 pr-3 shrink-0">{i + 1}</span>
              <span className={cn(
                line.trim().startsWith("<!--") ? "text-emerald-600/60" :
                line.trim().startsWith("<?") ? "text-blue-400/60" :
                line.trim().startsWith("</") ? "text-slate-500" :
                line.trim().startsWith("<") ? "text-sky-400/70" :
                "text-slate-400",
              )}>{line || " "}</span>
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}


/* ── Conflicts Pane ────────────────────────────────────────────────── */

function ConflictsPane({ conflicts, onResolveConflict, onResolveAll }: {
  conflicts: ConflictEntry[];
  onResolveConflict: (key: string, resolution: "a" | "b" | "keep-both" | null) => void;
  onResolveAll: (resolution: "a" | "b") => void;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="size-10 text-emerald-500/30 mb-3" />
        <p className="text-sm text-slate-300 font-medium">No Conflicts</p>
        <p className="text-xs text-slate-500 mt-1">All entries merge cleanly with no overlapping keys.</p>
      </div>
    );
  }

  const resolved = conflicts.filter((c: ConflictEntry) => c.resolution !== null).length;

  return (
    <div className="h-full flex flex-col">
      {/* Bulk actions */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-amber-400">{conflicts.length}</span> conflict{conflicts.length !== 1 ? "s" : ""}
          {resolved > 0 && <span className="text-emerald-400/60"> ({resolved} resolved)</span>}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-[#1e2d45] bg-transparent text-slate-400 hover:bg-[#111d33]" onClick={() => onResolveAll("a")}>
            Keep All First
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-[#1e2d45] bg-transparent text-slate-400 hover:bg-[#111d33]" onClick={() => onResolveAll("b")}>
            Keep All Last
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {conflicts.map((conflict: ConflictEntry) => (
            <ConflictCard key={conflict.key} conflict={conflict} onResolve={(resolution) => onResolveConflict(conflict.key, resolution)} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConflictCard({ conflict, onResolve }: {
  conflict: ConflictEntry;
  onResolve: (resolution: "a" | "b" | "keep-both" | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      conflict.resolution
        ? "border-emerald-500/15 bg-emerald-950/5"
        : "border-amber-500/20 bg-amber-950/5",
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <AlertTriangle className={cn(
          "size-3.5 shrink-0",
          conflict.resolution ? "text-emerald-500/50" : "text-amber-400",
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{conflict.keyLabel}</p>
          <p className="text-[10px] text-slate-500">{conflict.versions.length} versions</p>
        </div>
        {conflict.resolution && (
          <span className="text-[10px] text-emerald-400/70 shrink-0">Resolved</span>
        )}
        <ChevronRight className={cn("size-3.5 text-slate-600 transition-transform", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Side-by-side snippets */}
              <div className="grid grid-cols-2 gap-2">
                {conflict.versions.slice(0, 2).map((version, i) => (
                  <div key={version.fileIndex} className="rounded-md border border-[#1a2740] bg-[#060e1f] p-2">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                      {version.fileName} {i === 0 ? "(A)" : "(B)"}
                    </p>
                    <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-auto">
                      {version.snippet}
                    </pre>
                  </div>
                ))}
              </div>

              {/* Resolution buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 h-7 text-[10px]",
                    conflict.resolution === "a"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-[#1e2d45] bg-transparent text-slate-400",
                  )}
                  onClick={() => onResolve("a")}
                >
                  Choose A
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 h-7 text-[10px]",
                    conflict.resolution === "b"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-[#1e2d45] bg-transparent text-slate-400",
                  )}
                  onClick={() => onResolve("b")}
                >
                  Choose B
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 h-7 text-[10px]",
                    conflict.resolution === "keep-both"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-[#1e2d45] bg-transparent text-slate-400",
                  )}
                  onClick={() => onResolve("keep-both")}
                >
                  Keep Both
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ── Success View (Step 3) ─────────────────────────────────────────── */

function SuccessView({ summary, savedPath, onReset }: {
  summary: MergeSummary | null;
  savedPath: string;
  onReset: () => void;
  onStartNew: () => void;
}) {
  return (
    <motion.div
      className="text-center max-w-md space-y-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Animated checkmark */}
      <motion.div
        className="mx-auto size-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <CheckCircle2 className="size-10 text-emerald-400" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Merge Complete</h2>
        <p className="text-sm text-slate-400">Your files have been merged successfully.</p>
      </div>

      {summary && (
        <div className="rounded-lg border border-[#1a2740] bg-[#0a1628]/60 p-4 text-left space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-500">Type</div>
            <div className="text-slate-200 font-medium">{META_TYPE_LABELS[summary.type]}</div>
            <div className="text-slate-500">Entries merged</div>
            <div className="text-slate-200 font-medium">{summary.uniqueEntries}</div>
            <div className="text-slate-500">Duplicates removed</div>
            <div className="text-slate-200 font-medium">{summary.duplicatesRemoved}</div>
            <div className="text-slate-500">Comments preserved</div>
            <div className="text-slate-200 font-medium">{summary.preservedComments}</div>
          </div>
        </div>
      )}

      {savedPath && (
        <div className="rounded-lg border border-[#1a2740] bg-[#0a1628]/40 px-4 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Saved to</p>
          <p className="text-xs text-slate-300 font-mono break-all">{savedPath}</p>
        </div>
      )}

      <div className="flex gap-3 justify-center pt-2">
        <Button
          variant="outline"
          className="gap-2 border-[#1e2d45] bg-[#0a1628] hover:bg-[#111d33] text-slate-300"
          onClick={onReset}
        >
          <RotateCcw className="size-4" /> New Merge
        </Button>
      </div>
    </motion.div>
  );
}


/* ── Sticky Action Bar ─────────────────────────────────────────────── */

function StickyActionBar({ step, files, conflicts, canAdvance, isMerging, error, onBack, onNext }: {
  step: MergeStep;
  files: MergeFileEntry[];
  conflicts: ConflictEntry[];
  canAdvance: boolean;
  isMerging: boolean;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const parsedFiles = files.filter((f) => f.status === "parsed").length;
  const unresolvedConflicts = conflicts.filter((c) => c.resolution === null).length;

  return (
    <div className="border-t border-[#131a2b] bg-[#050d21]/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {step === 1 && (
          <>
            <span>{parsedFiles} file{parsedFiles !== 1 ? "s" : ""} ready</span>
            {files.length >= 2 && files.length !== parsedFiles && (
              <span className="text-amber-400/70">{files.length - parsedFiles} with errors</span>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <span>{parsedFiles} files</span>
            {unresolvedConflicts > 0 && (
              <span className="text-amber-400">{unresolvedConflicts} unresolved conflict{unresolvedConflicts !== 1 ? "s" : ""}</span>
            )}
          </>
        )}
        {error && step === 1 && (
          <span className="text-red-400 truncate max-w-xs">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {step > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-[#1e2d45] bg-transparent text-slate-300 hover:bg-[#111d33]"
            onClick={onBack}
          >
            <ArrowLeft className="size-3.5" /> Back
          </Button>
        )}

        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={!canAdvance || isMerging}
          onClick={onNext}
        >
          {step === 1 ? (
            <>
              Review <ArrowRight className="size-3.5" />
            </>
          ) : isMerging ? (
            "Merging..."
          ) : (
            <>
              <Download className="size-3.5" /> Merge & Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

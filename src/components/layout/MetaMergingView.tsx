import { Fragment, useCallback, useEffect, useMemo, useState, type DragEventHandler, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  Files,
  FilePlus2,
  FolderPlus,
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SquareToggle } from "@/components/SquareToggle";
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
import { useMergeStore, type MergeStep, type MergeFileEntry, type MergeRules, type MergeOutputSettings, type ConflictEntry, type DuplicateStrategy, type SortStrategy } from "@/store/merge-store";
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
    <div className="h-full flex flex-col overflow-hidden bg-background-app">
      {/* ── Stepper Bar ────────────────────────────────────────── */}
      <StepperBar step={step} onStepClick={(s) => { if (s < step || (s === 2 && canAdvanceToReview)) store.setStep(s); }} canReview={canAdvanceToReview} mergeSuccess={mergeSuccess} />

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step-1" {...SLIDE_UP} className="h-full flex">
              {/* Left Pane: File List */}
              <div className="w-[340px] min-w-[280px] border-r border-border/60 flex flex-col">
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
              <div className="w-[340px] min-w-[280px] border-r border-border/60 flex flex-col overflow-hidden">
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

                    <Separator />

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
                  <motion.div {...FADE_IN} className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
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
        <AlertDialogContent className="border-border/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Similar Handling IDs Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Similar handling IDs were found (e.g. variant suffixes). Consolidate to one canonical ID per group?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-40 rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="space-y-1 text-xs font-mono">
            {similarHandlingPairs.slice(0, 8).map((pair) => (
              <div key={pair} className="text-muted-foreground">{pair}</div>
            ))}
            {similarHandlingPairs.length > 8 && (
              <div className="text-muted-foreground/70">+{similarHandlingPairs.length - 8} more...</div>
            )}
            </div>
          </ScrollArea>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border/60 bg-transparent text-foreground/85 hover:bg-accent/30"
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
    <div className="border-b border-border/60 bg-background-app px-6 py-3 flex items-center gap-1">
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
                isComplete || isActive ? "bg-primary/50" : "bg-muted",
              )} />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!isClickable || isDisabled}
              onClick={() => isClickable && onStepClick(s)}
              className={cn(
                "h-auto gap-2 px-3 py-1.5 text-xs font-medium",
                isActive && "border border-primary/30 bg-accent/20 text-primary shadow-sm",
                isComplete && !isActive && "text-primary/80",
                !isActive && !isComplete && !isDisabled && "text-muted-foreground hover:text-foreground",
                isDisabled && "cursor-not-allowed text-muted-foreground/70 opacity-50",
              )}
            >
              <span className={cn(
                "flex items-center justify-center size-5 rounded-full text-[10px] font-bold border transition-all",
                isActive && "border-primary/50 bg-primary/10 text-primary",
                isComplete && !isActive && "border-primary/40 bg-primary/20 text-primary",
                !isActive && !isComplete && "border-border bg-transparent text-muted-foreground",
              )}>
                {isComplete && !isActive ? <Check className="size-3" /> : s}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </Button>
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
      <div className="p-3 space-y-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Input Files</h3>
          {files.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClearAll}
              className="h-auto px-1 py-0 text-[10px] uppercase tracking-[0.08em] text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs border-border/60 bg-card hover:bg-accent/30 text-foreground/85"
            onClick={onSelectFiles}
          >
            <FilePlus2 className="size-3.5" /> Add Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs border-border/60 bg-card hover:bg-accent/30 text-foreground/85"
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
            {files.map((file) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -12, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <FileRow file={file} onRemove={() => onRemoveFile(file.path)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {files.length === 0 && (
            <div className="py-8 text-center">
              <FileCode2 className="size-8 mx-auto mb-3 text-muted-foreground/70" />
              <p className="text-xs text-muted-foreground">No files added yet</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">Drop files or use the buttons above</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center gap-3">
          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
          {detectedType && (
            <>
              <span className="opacity-35">|</span>
              <span className="text-primary/70">{META_TYPE_LABELS[detectedType]}</span>
            </>
          )}
          <span className="opacity-35">|</span>
          <span>{files.reduce((sum, f) => sum + f.entryCount, 0)} entries</span>
        </div>
      )}
    </div>
  );
}


/* ── File Row ──────────────────────────────────────────────────────── */

function FileRow({ file, onRemove }: { file: MergeFileEntry; onRemove: () => void }) {
  const isError = file.status === "error";

  return (
    <div className={cn(
      "group relative rounded-lg border px-3 py-2 transition-all duration-150",
      isError
        ? "border-destructive/30 bg-destructive/10"
        : "border-border/60 bg-card/60 hover:bg-accent/20 hover:border-primary/20",
    )}>
      <div className="flex items-start gap-2">
        <GripVertical className="size-3.5 text-muted-foreground/70 mt-0.5 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-foreground truncate">{file.name}</p>

            {file.detectedType && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-accent/30 border border-border/60 text-muted-foreground">
                {META_TYPE_LABELS[file.detectedType]}
              </span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{file.path}</p>

          <div className="flex items-center gap-2 mt-1">
            {file.entryCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {file.entryCount} {file.detectedType === "vehicles" ? "vehicle" : file.detectedType === "handling" ? "handling" : "entr"}{file.entryCount !== 1 ? (file.detectedType === "vehicles" || file.detectedType === "handling" ? "s" : "ies") : (file.detectedType === "vehicles" || file.detectedType === "handling" ? "" : "y")}
              </span>
            )}

            {isError ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
                <XCircle className="size-3" /> {file.errorMessage ?? "Error"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                <CheckCircle2 className="size-3" /> parsed
              </span>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="shrink-0 opacity-0 transition-all text-muted-foreground/70 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </Button>
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
              : "border-border/60 bg-card/40",
          )}
          animate={isDragOver ? { scale: 1.08, borderColor: "rgba(100,200,255,0.5)" } : { scale: 1 }}
        >
          <Files className={cn(
            "size-8 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground/70",
          )} />
        </motion.div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isDragOver ? "Drop files here" : "Drop meta files to merge"}
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Merge multiple meta files of the same type into one clean output.
        </p>

        {/* Type chips */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {SUPPORTED_TYPES.map((type) => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-accent/20 border border-border/60 text-muted-foreground"
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
            className="gap-2 border-border/60 bg-card hover:bg-accent/30 text-foreground/85"
            onClick={onSelectFiles}
          >
            <FilePlus2 className="size-4" /> Add Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 bg-card hover:bg-accent/30 text-foreground/85"
            onClick={onSelectFolder}
          >
            <FolderPlus className="size-4" /> Add Folder
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-4">
          Example: merge multiple <span className="text-muted-foreground">vehicles.meta</span> files into one.
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
          <h3 className="text-lg font-semibold text-foreground">Ready to Review</h3>
          <p className="text-sm text-muted-foreground mt-1">Your files are loaded. Proceed to review merge options.</p>
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
    default: "text-muted-foreground border-border/60",
    primary: "text-primary border-primary/20",
    success: "text-primary border-primary/20",
    warning: "text-primary border-primary/20",
    error: "text-destructive border-destructive/20",
  };

  return (
    <div className={cn("rounded-lg border bg-card/60 p-3 space-y-1", colorMap[color])}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground/70">{sublabel}</p>
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
    <motion.div {...FADE_IN} className="mx-4 mt-4 rounded-lg border border-border/60 bg-card/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary/60" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Merge Summary</h3>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            <span className={cn(
              "text-sm font-bold",
              "warn" in s && s.warn ? "text-primary" : "highlight" in s && s.highlight ? "text-primary/80" : "text-foreground",
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
        <Settings2 className="size-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Merge Rules</h3>
      </div>

      {/* Key field */}
      {detectedType && (
        <div className="rounded-lg border border-border/60 bg-card/60 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Key Field (Auto-Detected)</p>
          <p className="text-xs text-foreground/85 font-mono">
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
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Duplicate Handling</p>
        <div className="space-y-1">
          {([
            { value: "keep-first" as const, label: "Keep first occurrence" },
            { value: "keep-last" as const, label: "Keep last occurrence" },
            { value: "manual" as const, label: "Manually resolve conflicts" },
          ]).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSetDuplicateStrategy(opt.value)}
              className={cn(
                "h-auto w-full justify-start gap-2.5 px-3 py-2 text-xs",
                rules.duplicateStrategy === opt.value
                  ? "border border-primary/25 bg-primary/10 text-primary"
                  : "border border-transparent bg-card/40 text-muted-foreground hover:bg-accent/20 hover:text-foreground/85",
              )}
            >
              <div className={cn(
                "size-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                rules.duplicateStrategy === opt.value ? "border-primary" : "border-border",
              )}>
                {rules.duplicateStrategy === opt.value && <div className="size-1.5 rounded-full bg-primary" />}
              </div>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sorting</p>
        <div className="space-y-1">
          {([
            { value: "preserve" as const, label: "Preserve original order" },
            { value: "alphabetical" as const, label: "Sort alphabetically by key" },
          ]).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSetSortStrategy(opt.value)}
              className={cn(
                "h-auto w-full justify-start gap-2.5 px-3 py-2 text-xs",
                rules.sortStrategy === opt.value
                  ? "border border-primary/25 bg-primary/10 text-primary"
                  : "border border-transparent bg-card/40 text-muted-foreground hover:bg-accent/20 hover:text-foreground/85",
              )}
            >
              <div className={cn(
                "size-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                rules.sortStrategy === opt.value ? "border-primary" : "border-border",
              )}>
                {rules.sortStrategy === opt.value && <div className="size-1.5 rounded-full bg-primary" />}
              </div>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Toggle options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            Preserve inline comments
          </Label>
          <SquareToggle checked={rules.preserveComments} onCheckedChange={onSetPreserveComments} />
        </div>

        {(detectedType === "vehicles" || !detectedType) && (
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <GitCompare className="size-3.5 text-muted-foreground" />
              Consolidate similar handling IDs
            </Label>
            <SquareToggle checked={rules.consolidateSimilarHandlingIds} onCheckedChange={onSetConsolidateHandling} />
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
        <Download className="size-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output Settings</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Output Filename</Label>
        <Input
          placeholder={detectedType ? `${detectedType}.merged.meta` : "merged.meta"}
          value={output.outputFileName}
          onChange={(e) => onSetFileName(e.target.value)}
          className="h-8 text-xs bg-card border-border/60 text-foreground/85 placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Create backup of overwritten file</Label>
          <SquareToggle checked={output.createBackup} onCheckedChange={onSetCreateBackup} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">Open output after merge</Label>
          <SquareToggle checked={output.openAfterMerge} onCheckedChange={onSetOpenAfterMerge} />
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
      <TabsList variant="line" className="mb-3 border-b border-border/60">
        <TabsTrigger value="preview" className="gap-1.5 text-xs">
          <Eye className="size-3.5" /> Merged Preview
        </TabsTrigger>
        <TabsTrigger value="conflicts" className="gap-1.5 text-xs">
          <AlertTriangle className="size-3.5" />
          Conflicts
          {conflicts.length > 0 && (
            <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-medium text-primary">
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
      <div className="h-full flex items-center justify-center text-muted-foreground/70 text-xs">
        No preview available yet
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-border/60 bg-background/60 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Merged Output</span>
        <span className="text-[10px] text-muted-foreground/70">{lineCount} lines</span>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-3 text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre overflow-x-auto">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-right text-muted-foreground/70 w-10 pr-3 shrink-0">{i + 1}</span>
              <span className={cn(
                line.trim().startsWith("<!--") ? "text-primary/60" :
                line.trim().startsWith("<?") ? "text-primary/60" :
                line.trim().startsWith("</") ? "text-muted-foreground" :
                line.trim().startsWith("<") ? "text-primary/80" :
                "text-muted-foreground",
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
        <CheckCircle2 className="mb-3 size-10 text-primary/40" />
        <p className="text-sm text-foreground/85 font-medium">No Conflicts</p>
        <p className="text-xs text-muted-foreground mt-1">All entries merge cleanly with no overlapping keys.</p>
      </div>
    );
  }

  const resolved = conflicts.filter((c: ConflictEntry) => c.resolution !== null).length;

  return (
    <div className="h-full flex flex-col">
      {/* Bulk actions */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{conflicts.length}</span> conflict{conflicts.length !== 1 ? "s" : ""}
          {resolved > 0 && <span className="text-primary/70"> ({resolved} resolved)</span>}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-border/60 bg-transparent text-muted-foreground hover:bg-accent/30" onClick={() => onResolveAll("a")}>
            Keep All First
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-border/60 bg-transparent text-muted-foreground hover:bg-accent/30" onClick={() => onResolveAll("b")}>
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
        ? "border-primary/20 bg-primary/5"
        : "border-border/70 bg-card/60",
    )}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
      >
        <AlertTriangle className={cn(
          "size-3.5 shrink-0",
          conflict.resolution ? "text-primary/70" : "text-primary",
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{conflict.keyLabel}</p>
          <p className="text-[10px] text-muted-foreground">{conflict.versions.length} versions</p>
        </div>
        {conflict.resolution && (
          <span className="shrink-0 text-[10px] text-primary/70">Resolved</span>
        )}
        <ChevronRight className={cn("size-3.5 text-muted-foreground/70 transition-transform", expanded && "rotate-90")} />
      </Button>

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
                  <div key={version.fileIndex} className="rounded-md border border-border/60 bg-background/60 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                      {version.fileName} {i === 0 ? "(A)" : "(B)"}
                    </p>
                    <ScrollArea className="max-h-32">
                      <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                        {version.snippet}
                      </pre>
                    </ScrollArea>
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
                      : "border-border/60 bg-transparent text-muted-foreground",
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
                      : "border-border/60 bg-transparent text-muted-foreground",
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
                      : "border-border/60 bg-transparent text-muted-foreground",
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
        className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <CheckCircle2 className="size-10 text-primary" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">Merge Complete</h2>
        <p className="text-sm text-muted-foreground">Your files have been merged successfully.</p>
      </div>

      {summary && (
        <div className="rounded-lg border border-border/60 bg-card/60 p-4 text-left space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Type</div>
            <div className="text-foreground font-medium">{META_TYPE_LABELS[summary.type]}</div>
            <div className="text-muted-foreground">Entries merged</div>
            <div className="text-foreground font-medium">{summary.uniqueEntries}</div>
            <div className="text-muted-foreground">Duplicates removed</div>
            <div className="text-foreground font-medium">{summary.duplicatesRemoved}</div>
            <div className="text-muted-foreground">Comments preserved</div>
            <div className="text-foreground font-medium">{summary.preservedComments}</div>
          </div>
        </div>
      )}

      {savedPath && (
        <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Saved to</p>
          <p className="text-xs text-foreground/85 font-mono break-all">{savedPath}</p>
        </div>
      )}

      <div className="flex gap-3 justify-center pt-2">
        <Button
          variant="outline"
          className="gap-2 border-border/60 bg-card hover:bg-accent/30 text-foreground/85"
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
    <div className="border-t border-border/60 bg-card/90  px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {step === 1 && (
          <>
            <span>{parsedFiles} file{parsedFiles !== 1 ? "s" : ""} ready</span>
            {files.length >= 2 && files.length !== parsedFiles && (
              <span className="text-destructive/80">{files.length - parsedFiles} with errors</span>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <span>{parsedFiles} files</span>
            {unresolvedConflicts > 0 && (
              <span className="text-primary">{unresolvedConflicts} unresolved conflict{unresolvedConflicts !== 1 ? "s" : ""}</span>
            )}
          </>
        )}
        {error && step === 1 && (
          <span className="max-w-xs truncate text-destructive">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {step > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border/60 bg-transparent text-foreground/85 hover:bg-accent/30"
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



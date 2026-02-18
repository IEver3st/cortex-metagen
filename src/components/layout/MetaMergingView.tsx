import { useMemo, useState, type DragEventHandler } from "react";
import { motion, AnimatePresence } from "motion/react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  FileUp,
  Merge,
  Trash2,
  Check,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Sparkles,
  X,
  RefreshCw,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  mergeMetaFiles,
  previewSimilarHandlingIds,
  type MergeFileInput,
  type MergeSummary,
} from "@/lib/meta-merge";
import { detectMetaType } from "@/lib/xml-parser";
import type { MetaFileType } from "@/store/meta-store";

interface LoadedMergeFile extends MergeFileInput {
  name: string;
  detectedType: MetaFileType | null;
}

const FILE_TYPE_LABELS: Record<MetaFileType, string> = {
  handling: "Handling",
  vehicles: "Vehicles",
  carcols: "Carcols",
  carvariations: "Carvariations",
  vehiclelayouts: "VehicleLayouts",
  modkits: "Modkits",
};

const FILE_TYPE_COLORS: Record<MetaFileType, string> = {
  handling: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  vehicles: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  carcols: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  carvariations: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  vehiclelayouts: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  modkits: "text-orange-400 bg-orange-400/10 border-orange-400/30",
};

type MergeStage = "add" | "review" | "complete";

function AnimatedNumber({ value, duration = 0.5 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, type: "spring", stiffness: 200 }}
      className="tabular-nums"
    >
      {value}
    </motion.span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/40 bg-card/50 p-4",
        "group hover:border-primary/30 transition-colors"
      )}
    >
      {Icon && (
        <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>
        <AnimatedNumber value={value} />
      </p>
    </motion.div>
  );
}

export function MetaMergingView() {
  const [files, setFiles] = useState<LoadedMergeFile[]>([]);
  const [summary, setSummary] = useState<MergeSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [similarHandlingPromptOpen, setSimilarHandlingPromptOpen] = useState(false);
  const [similarHandlingPairs, setSimilarHandlingPairs] = useState<string[]>([]);

  const stage: MergeStage = useMemo(() => {
    if (summary) return "complete";
    if (files.length >= 2) return "review";
    return "add";
  }, [files.length, summary]);

  const canMerge = files.length >= 2;
  const uniqueNames = useMemo(() => new Set(files.map((file) => file.path)).size, [files]);

  const detectedTypes = useMemo(() => {
    const types = new Set<MetaFileType>();
    files.forEach((f) => {
      if (f.detectedType) types.add(f.detectedType);
    });
    return [...types];
  }, [files]);

  const hasMixedTypes = detectedTypes.length > 1;

  const loadFilesFromPaths = async (paths: string[]) => {
    const loaded: LoadedMergeFile[] = [];

    for (const path of paths) {
      const content = await invoke<string>("read_meta_file", { path });
      const fileName = path.split(/[/\\]/).pop() ?? path;
      const detectedType = detectMetaType(content, fileName);
      loaded.push({
        path,
        content,
        name: fileName,
        detectedType,
      });
    }

    setFiles((current) => {
      const map = new Map<string, LoadedMergeFile>();
      for (const file of [...current, ...loaded]) {
        map.set(file.path, file);
      }
      return [...map.values()];
    });
    setSummary(null);
    setError("");
  };

  const handleSelectFiles = async () => {
    setError("");
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: "Meta/XML", extensions: ["meta", "xml"] }],
      title: "Select Meta Files to Merge",
    });

    if (!selected) return;
    const list = Array.isArray(selected) ? selected : [selected];
    await loadFilesFromPaths(list);
  };

  const executeMergeAndSave = async (consolidateSimilarHandlingIds: boolean) => {
    setError("");
    setSummary(null);
    setIsMerging(true);

    try {
      const result = mergeMetaFiles(files, { consolidateSimilarHandlingIds });
      const targetPath = await saveDialog({
        title: "Save merged meta",
        defaultPath: `${result.summary.type}.merged.meta`,
        filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
      });

      if (!targetPath) {
        setIsMerging(false);
        return;
      }

      await invoke("write_meta_file", { path: targetPath, content: result.xml });
      setSummary(result.summary);
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : String(mergeError));
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeAndSave = async () => {
    setError("");
    const similarPairs = previewSimilarHandlingIds(files);

    if (similarPairs.length > 0) {
      setSimilarHandlingPairs(similarPairs);
      setSimilarHandlingPromptOpen(true);
      return;
    }

    await executeMergeAndSave(true);
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const dropped = [...(event.dataTransfer.files ?? [])] as Array<File & { path?: string }>;
    const paths = dropped
      .map((file) => file.path)
      .filter((path): path is string => Boolean(path && /\.(meta|xml)$/i.test(path)));

    if (paths.length === 0) return;
    setError("");
    await loadFilesFromPaths(paths);
  };

  const handleReset = () => {
    setFiles([]);
    setSummary(null);
    setError("");
  };

  return (
    <motion.div
      className="h-full overflow-auto custom-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Merge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Meta File Merger</h1>
                <p className="text-xs text-muted-foreground">
                  Combine multiple meta files into a single output
                </p>
              </div>
            </div>
            {files.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </motion.header>

        <div className="flex items-center gap-2 px-1">
          {(["add", "review", "complete"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  stage === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["add", "review", "complete"].indexOf(stage)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground"
                )}
                animate={{
                  scale: stage === s ? 1.02 : 1,
                }}
              >
                {i < ["add", "review", "complete"].indexOf(stage) ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>
                )}
                {s}
              </motion.div>
              {i < 2 && (
                <ArrowRight
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    i < ["add", "review", "complete"].indexOf(stage)
                      ? "text-primary"
                      : "text-muted-foreground/50"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-all duration-200",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/50 hover:border-border"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <AnimatePresence mode="wait">
            {isDragOver ? (
              <motion.div
                key="drop-active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="p-4 rounded-2xl bg-primary/10 border border-primary/30"
                >
                  <FileUp className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="text-sm font-medium text-primary">Drop files here</p>
              </motion.div>
            ) : (
              <motion.div
                key="drop-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">
                    Drag & drop <span className="font-mono">.meta</span> or{" "}
                    <span className="font-mono">.xml</span> files
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleSelectFiles}
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Browse
                  </Button>
                </div>

                <AnimatePresence mode="popLayout">
                  {files.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 gap-2 text-center"
                    >
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                        <FileCode className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add at least 2 files to start merging
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="files"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {files.map((file, index) => (
                        <motion.div
                          key={file.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 hover:border-border/60 transition-colors"
                        >
                          <div className="p-1.5 rounded-md bg-muted/50">
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium truncate">{file.name}</p>
                              {file.detectedType && (
                                <span
                                  className={cn(
                                    "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border",
                                    FILE_TYPE_COLORS[file.detectedType]
                                  )}
                                >
                                  {FILE_TYPE_LABELS[file.detectedType]}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {file.path}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() =>
                              setFiles((current) =>
                                current.filter((item) => item.path !== file.path)
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {files.length > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>
                        {files.length} file{files.length !== 1 ? "s" : ""}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      <span>{uniqueNames} unique</span>
                      {detectedTypes.length === 1 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span className="flex items-center gap-1">
                            Target:
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded font-semibold",
                                FILE_TYPE_COLORS[detectedTypes[0]]
                              )}
                            >
                              {FILE_TYPE_LABELS[detectedTypes[0]]}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {hasMixedTypes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-amber-200">Mixed file types detected</p>
                <p className="text-muted-foreground mt-0.5">
                  All files must be the same type. Remove mismatched files or add only one type.
                </p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canMerge && !hasMixedTypes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-center"
            >
              <Button
                size="lg"
                className="gap-2 px-8 h-11"
                onClick={handleMergeAndSave}
                disabled={isMerging}
              >
                {isMerging ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.div>
                    Merging...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Merge & Save
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <div className="p-1 rounded-full bg-emerald-400/20">
                  <Check className="h-3.5 w-3.5" />
                </div>
                Merge Complete
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Input Files"
                  value={summary.inputFiles}
                  icon={FileCode}
                  delay={0.1}
                />
                <StatCard
                  label="Unique Entries"
                  value={summary.uniqueEntries}
                  icon={Zap}
                  color="text-primary"
                  delay={0.15}
                />
                <StatCard
                  label="Duplicates Removed"
                  value={summary.duplicatesRemoved}
                  icon={Trash2}
                  color="text-amber-400"
                  delay={0.2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Parsed"
                  value={summary.parsedEntries}
                  delay={0.25}
                />
                <StatCard
                  label="Comments Preserved"
                  value={summary.preservedComments}
                  delay={0.3}
                />
              </div>

              {summary.handlingIdConsolidations > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs"
                >
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong>{summary.handlingIdConsolidations}</strong> similar handling IDs were
                    consolidated
                  </span>
                </motion.div>
              )}

              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Start New Merge
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-lg border border-border/30 bg-muted/10 p-3 text-[10px] text-muted-foreground space-y-1">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Important:</span>
          </p>
          <ul className="ml-5 space-y-0.5 list-disc">
            <li>Merge files of the same type only</li>
            <li>Duplicate entries (by model name or handling ID) are automatically removed</li>
            <li>Inline comments are preserved when possible</li>
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {similarHandlingPromptOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSimilarHandlingPromptOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-sm">Similar Handling IDs</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSimilarHandlingPromptOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Similar handling IDs were detected (e.g., variant suffixes). Would you like to
                  consolidate them into a single canonical ID?
                </p>

                <div className="max-h-32 overflow-auto rounded-lg border border-border/40 bg-muted/20 p-2">
                  <div className="space-y-1 font-mono text-[10px]">
                    {similarHandlingPairs.slice(0, 6).map((pair) => (
                      <div key={pair} className="flex items-center gap-2 text-muted-foreground">
                        <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{pair}</span>
                      </div>
                    ))}
                    {similarHandlingPairs.length > 6 && (
                      <p className="text-muted-foreground/60">
                        +{similarHandlingPairs.length - 6} more...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border/50 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSimilarHandlingPromptOpen(false);
                    void executeMergeAndSave(false);
                  }}
                >
                  Keep Separate
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSimilarHandlingPromptOpen(false);
                    void executeMergeAndSave(true);
                  }}
                >
                  Consolidate
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

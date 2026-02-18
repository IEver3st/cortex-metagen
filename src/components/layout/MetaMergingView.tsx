import { useMemo, useState, type DragEventHandler } from "react";
import { motion } from "motion/react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Files, FilePlus2, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  mergeMetaFiles,
  previewSimilarHandlingIds,
  type MergeFileInput,
  type MergeSummary,
} from "@/lib/meta-merge";

interface LoadedMergeFile extends MergeFileInput {
  name: string;
}

export function MetaMergingView() {
  const [files, setFiles] = useState<LoadedMergeFile[]>([]);
  const [summary, setSummary] = useState<MergeSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [similarHandlingPromptOpen, setSimilarHandlingPromptOpen] = useState(false);
  const [similarHandlingPairs, setSimilarHandlingPairs] = useState<string[]>([]);

  const canMerge = files.length >= 2;

  const uniqueNames = useMemo(() => new Set(files.map((file) => file.path)).size, [files]);

  const loadFilesFromPaths = async (paths: string[]) => {
    const loaded: LoadedMergeFile[] = [];

    for (const path of paths) {
      const content = await invoke<string>("read_meta_file", { path });
      loaded.push({
        path,
        content,
        name: path.split(/[/\\]/).pop() ?? path,
      });
    }

    setFiles((current) => {
      const map = new Map<string, LoadedMergeFile>();
      for (const file of [...current, ...loaded]) {
        map.set(file.path, file);
      }
      return [...map.values()];
    });
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

  return (
    <motion.div
      className="h-full overflow-auto p-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`p-4 space-y-3 transition-colors ${isDragOver ? "border-primary/60 bg-primary/5" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Meta Merging</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={handleSelectFiles}>
              <FilePlus2 className="h-4 w-4" /> Add Files
            </Button>
            <Button size="sm" className="h-8 gap-2" onClick={handleMergeAndSave} disabled={!canMerge || isMerging}>
              <Save className="h-4 w-4" /> {isMerging ? "Merging..." : "Merge & Save"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          Merge files of the same type only (handling, vehicles, carcols, carvariations, or vehiclelayouts). Inline comments are preserved when possible.
        </div>

        <div className="rounded-md border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
          Drag and drop multiple `.meta`/`.xml` files here, or use <strong>Add Files</strong>.
        </div>

        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
              Add at least 2 files to start merging.
            </div>
          ) : (
            files.map((file) => (
              <div key={file.path} className="rounded-md border border-border/50 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{file.path}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => setFiles((current) => current.filter((item) => item.path !== file.path))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          {files.length} file(s) loaded • {uniqueNames} unique path(s)
        </div>
      </Card>

      {error && (
        <Card className="p-3 border-destructive/40 bg-destructive/5 text-xs text-destructive">
          {error}
        </Card>
      )}

      {summary && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Merge Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border/50 p-2">Type: <span className="font-mono">{summary.type}</span></div>
            <div className="rounded border border-border/50 p-2">Input files: <span className="font-mono">{summary.inputFiles}</span></div>
            <div className="rounded border border-border/50 p-2">Parsed entries: <span className="font-mono">{summary.parsedEntries}</span></div>
            <div className="rounded border border-border/50 p-2">Unique kept: <span className="font-mono">{summary.uniqueEntries}</span></div>
            <div className="rounded border border-border/50 p-2">Duplicates removed: <span className="font-mono">{summary.duplicatesRemoved}</span></div>
            <div className="rounded border border-border/50 p-2">Comments kept: <span className="font-mono">{summary.preservedComments}</span></div>
            <div className="rounded border border-border/50 p-2">Handling IDs consolidated: <span className="font-mono">{summary.handlingIdConsolidations}</span></div>
          </div>
        </Card>
      )}

      <AlertDialog open={similarHandlingPromptOpen} onOpenChange={setSimilarHandlingPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Similar Handling IDs Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Similar handling IDs were found (for example variant suffixes). Use one canonical handling ID for each similar group?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-40 overflow-auto rounded-md border border-border/50 p-2 text-xs font-mono space-y-1">
            {similarHandlingPairs.slice(0, 8).map((pair) => (
              <div key={pair}>{pair}</div>
            ))}
            {similarHandlingPairs.length > 8 && (
              <div className="text-muted-foreground">+{similarHandlingPairs.length - 8} more…</div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                void executeMergeAndSave(false);
              }}
            >
              Keep Separate IDs
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void executeMergeAndSave(true);
              }}
            >
              Use One Handling ID
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

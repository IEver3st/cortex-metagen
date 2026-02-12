import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { ChevronDown, ChevronRight, FileCode2, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type TreeNode =
  | {
      type: "dir";
      name: string;
      path: string;
      children: TreeNode[];
    }
  | {
      type: "file";
      name: string;
      path: string;
      metaType: MetaFileType | null;
    };

function normalizePath(path: string): string {
  return path.replaceAll("\\\\", "/");
}

function getRelativePath(fullPath: string, workspacePath: string | null): string {
  if (!workspacePath) return fullPath;
  const full = normalizePath(fullPath);
  const root = normalizePath(workspacePath).replace(/\/+$/, "");
  if (full.toLowerCase().startsWith(root.toLowerCase() + "/")) return full.slice(root.length + 1);
  return full;
}

function metaTypeFromFileName(fileName: string): MetaFileType | null {
  const fn = fileName.toLowerCase();
  if (fn.includes("handling")) return "handling";
  if (fn.includes("vehicles")) return "vehicles";
  if (fn.includes("carcols")) return "carcols";
  if (fn.includes("carvariations") || fn.includes("carvariation")) return "carvariations";
  if (fn.includes("vehiclelayout")) return "vehiclelayouts";
  if (fn.includes("modkits") || fn.includes("modkit")) return "modkits";
  return null;
}

function buildTree(paths: string[], workspacePath: string | null): TreeNode {
  const rootName = workspacePath ? normalizePath(workspacePath).split("/").filter(Boolean).pop() ?? "Workspace" : "Workspace";
  const root: TreeNode = { type: "dir", name: rootName, path: workspacePath ?? "", children: [] };

  const insert = (relative: string, fullPath: string) => {
    const parts = relative.split("/").filter(Boolean);
    let current = root as Extract<TreeNode, { type: "dir" }>;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? "";
      const isLast = i === parts.length - 1;

      if (isLast) {
        const metaType = metaTypeFromFileName(part);
        current.children.push({ type: "file", name: part, path: fullPath, metaType });
        return;
      }

      const existing = current.children.find(
        (c): c is Extract<TreeNode, { type: "dir" }> => c.type === "dir" && c.name === part
      );
      if (existing) {
        current = existing;
        continue;
      }

      const nextDir: Extract<TreeNode, { type: "dir" }> = {
        type: "dir",
        name: part,
        path: current.path ? `${normalizePath(current.path)}/${part}` : part,
        children: [],
      };
      current.children.push(nextDir);
      current = nextDir;
    }
  };

  for (const p of paths) {
    const rel = getRelativePath(p, workspacePath);
    insert(normalizePath(rel), p);
  }

  const sortNode = (node: TreeNode) => {
    if (node.type !== "dir") return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sortNode(c);
  };
  sortNode(root);

  return root;
}

function iconForMetaType(metaType: MetaFileType | null) {
  if (!metaType) return { className: "text-muted-foreground", label: "Unsupported" };
  if (metaType === "handling") return { className: "text-primary", label: "Handling" };
  if (metaType === "vehicles") return { className: "text-primary", label: "Vehicles" };
  if (metaType === "carcols") return { className: "text-primary", label: "Carcols" };
  if (metaType === "carvariations") return { className: "text-primary", label: "Variations" };
  if (metaType === "vehiclelayouts") return { className: "text-primary", label: "Layouts" };
  return { className: "text-primary", label: "Modkits" };
}

export function WorkspaceExplorer() {
  const workspacePath = useMetaStore((s) => s.workspacePath);
  const workspaceMetaFiles = useMetaStore((s) => s.workspaceMetaFiles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const setUIView = useMetaStore((s) => s.setUIView);

  const tree = useMemo(() => buildTree(workspaceMetaFiles, workspacePath), [workspaceMetaFiles, workspacePath]);

  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({
    root: true,
  });

  const toggleDir = (key: string) => setOpenDirs((s) => ({ ...s, [key]: !s[key] }));

  const renderNode = (node: TreeNode, depth: number, key: string) => {
    if (node.type === "dir") {
      const open = openDirs[key] ?? depth < 1;
      const Icon = open ? FolderOpen : Folder;
      return (
        <div key={key}>
          <button
            type="button"
            className="w-full h-7 px-2 text-xs flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-sm"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => toggleDir(key)}
            title={node.name}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Icon className="h-3.5 w-3.5" />
            <span className="truncate">{node.name}</span>
          </button>

          {open && (
            <div>
              {node.children.map((child, idx) => renderNode(child, depth + 1, `${key}/${child.name}-${idx}`))}
            </div>
          )}
        </div>
      );
    }

    const { className, label } = iconForMetaType(node.metaType);
    const active = node.metaType ? activeTab === node.metaType : false;
    const supported = Boolean(node.metaType);

    return (
      <button
        key={key}
        type="button"
        disabled={!supported}
        className={`w-full h-7 px-2 text-xs flex items-center gap-2 rounded-sm text-left transition-colors disabled:opacity-50 disabled:pointer-events-none ${
          active
            ? "bg-card text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => {
          if (!node.metaType) return;
          setUIView("workspace");
          setActiveTab(node.metaType);
        }}
        title={node.path}
      >
        <FileCode2 className={`h-3.5 w-3.5 ${className}`} />
        <span className="truncate">{node.name}</span>
        {node.metaType && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        )}
      </button>
    );
  };

  return (
    <ScrollArea className={cn("h-full", "flex-1")}>
      <div className="py-2">
        {renderNode(tree, 0, "root")}
      </div>
    </ScrollArea>
  );
}

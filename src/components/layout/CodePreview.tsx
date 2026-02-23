import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useMetaStore, type MetaFileType } from "@/store/meta-store";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { detectMetaType, parseMetaFile, type ParseDiagnostic } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  WrapText,
  Indent,
  Search,
  PencilLine,
  Eye,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  ChevronsUpDown,
  ChevronsDownUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Custom Monaco theme – "cortex-surface"
// ---------------------------------------------------------------------------
// All chrome colors derive from the app's deep-navy surface system.
// Syntax tokens are desaturated variants of the teal/blue brand palette –
// deliberately avoiding the "unsaved orange" (yellow-400/500) which is
// reserved for state indicators only.
// ---------------------------------------------------------------------------

const THEME_NAME = "cortex-surface";

/** App surface palette (matches hardcoded hex used throughout the app) */
const surface = {
  bg:       "#050d21",   // surface-2 – editor background
  gutter:   "#060e27",   // surface-3 – gutter background
  border:   "#131a2b",   // standard panel border
  line:     "#0b1424",   // active line highlight (subtle)
  selection:"#1b2c47",   // selection background
  hover:    "#14233b",   // hover state
  widget:   "#0e1a30",   // find widget / suggest widget
  inputBg:  "#111d33",   // input backgrounds inside widgets
  inputBdr: "#2b3b56",   // input borders inside widgets
};

/** Neutral tones for non-text UI */
const neutral = {
  fg:        "#c8d6e5",  // primary foreground (slightly warmer than pure white)
  fgDim:     "#5d7a9b",  // muted text (line numbers, comments)
  fgBright:  "#dbe8ff",  // emphasized text (current line number)
  fgGhost:   "#2a3f60",  // very dim (indent guides, rulers)
};

/**
 * Syntax token palette – derived from brand teal/blue, desaturated 15-25%.
 * No orange used anywhere – that's reserved for unsaved-state UI.
 */
const syntax = {
  tag:       "#6fafc4",  // XML tags – desaturated teal
  attr:      "#8db0ca",  // attribute names – slate blue
  string:    "#a2c4a0",  // string values – muted sage green
  number:    "#b4c8e8",  // numbers – pale blue
  keyword:   "#7ca8c4",  // keywords/declarations – cool blue
  comment:   "#445a74",  // comments – very muted slate
  operator:  "#8eaad0",  // operators, punctuation – mid blue-gray
  entity:    "#9bb8d4",  // entity refs (&amp; etc)
};

/** Build the Monaco IStandaloneThemeData */
function buildThemeData(): Monaco.editor.IStandaloneThemeData {
  return {
    base: "vs-dark",
    inherit: false,
    rules: [
      // ── General ─────────────────────────────────────────────
      { token: "",                    foreground: neutral.fg.slice(1) },
      { token: "invalid",            foreground: "ff6b6b" },

      // ── XML / HTML tags ─────────────────────────────────────
      { token: "tag",                foreground: syntax.tag.slice(1) },
      { token: "tag.xml",            foreground: syntax.tag.slice(1) },
      { token: "metatag",            foreground: syntax.tag.slice(1) },
      { token: "metatag.xml",        foreground: syntax.tag.slice(1) },
      { token: "metatag.content.xml",foreground: syntax.tag.slice(1) },

      // ── Attribute names ─────────────────────────────────────
      { token: "attribute.name",     foreground: syntax.attr.slice(1) },
      { token: "attribute.name.xml", foreground: syntax.attr.slice(1) },
      { token: "attribute.name.html",foreground: syntax.attr.slice(1) },

      // ── Strings & attribute values ──────────────────────────
      { token: "string",             foreground: syntax.string.slice(1) },
      { token: "string.xml",         foreground: syntax.string.slice(1) },
      { token: "attribute.value",    foreground: syntax.string.slice(1) },
      { token: "attribute.value.xml",foreground: syntax.string.slice(1) },
      { token: "attribute.value.html",foreground: syntax.string.slice(1) },

      // ── Numbers ─────────────────────────────────────────────
      { token: "number",             foreground: syntax.number.slice(1) },
      { token: "number.xml",         foreground: syntax.number.slice(1) },

      // ── Keywords ────────────────────────────────────────────
      { token: "keyword",            foreground: syntax.keyword.slice(1) },

      // ── Comments ────────────────────────────────────────────
      { token: "comment",            foreground: syntax.comment.slice(1), fontStyle: "italic" },
      { token: "comment.xml",        foreground: syntax.comment.slice(1), fontStyle: "italic" },
      { token: "comment.content.xml",foreground: syntax.comment.slice(1), fontStyle: "italic" },

      // ── Delimiters / operators ──────────────────────────────
      { token: "delimiter",          foreground: syntax.operator.slice(1) },
      { token: "delimiter.xml",      foreground: syntax.operator.slice(1) },
      { token: "operators",          foreground: syntax.operator.slice(1) },

      // ── Entity references ───────────────────────────────────
      { token: "entity",             foreground: syntax.entity.slice(1) },
    ],
    colors: {
      // ── Editor background & foreground ────────────────────
      "editor.background":                    surface.bg,
      "editor.foreground":                    neutral.fg,

      // ── Active line ───────────────────────────────────────
      "editor.lineHighlightBackground":       surface.line,
      "editor.lineHighlightBorder":           "#00000000",

      // ── Selection ─────────────────────────────────────────
      "editor.selectionBackground":           surface.selection,
      "editor.selectionHighlightBackground":  surface.selection + "80",
      "editor.inactiveSelectionBackground":   surface.selection + "60",

      // ── Cursor ────────────────────────────────────────────
      "editorCursor.foreground":              "#6fafc4",

      // ── Find match ────────────────────────────────────────
      "editor.findMatchBackground":           "#1b3a5c",
      "editor.findMatchHighlightBackground":  "#14304d80",
      "editor.findMatchBorder":               "#3d6a94",

      // ── Gutter ────────────────────────────────────────────
      "editorGutter.background":              surface.gutter,
      "editorGutter.modifiedBackground":      "#d4a853",
      "editorGutter.addedBackground":         "#5a9b6b",
      "editorGutter.deletedBackground":       "#c45454",

      // ── Line numbers ──────────────────────────────────────
      "editorLineNumber.foreground":          neutral.fgDim,
      "editorLineNumber.activeForeground":    neutral.fgBright,
      "editorLineNumber.dimmedForeground":    neutral.fgGhost,

      // ── Indent guides ─────────────────────────────────────
      "editorIndentGuide.background":         neutral.fgGhost + "40",
      "editorIndentGuide.activeBackground":   neutral.fgDim + "50",
      "editorIndentGuide.background1":        neutral.fgGhost + "40",
      "editorIndentGuide.activeBackground1":  neutral.fgDim + "50",

      // ── Bracket matching ──────────────────────────────────
      "editorBracketMatch.background":        surface.selection + "80",
      "editorBracketMatch.border":            neutral.fgDim + "60",

      // ── Bracket pair colorization (keep neutral) ──────────
      "editorBracketHighlight.foreground1":   syntax.operator,
      "editorBracketHighlight.foreground2":   syntax.operator,
      "editorBracketHighlight.foreground3":   syntax.operator,

      // ── Widget chrome ─────────────────────────────────────
      "editorWidget.background":              surface.widget,
      "editorWidget.foreground":              neutral.fg,
      "editorWidget.border":                  surface.border,
      "editorSuggestWidget.background":       surface.widget,
      "editorSuggestWidget.border":           surface.border,
      "editorSuggestWidget.selectedBackground": surface.selection,
      "editorHoverWidget.background":         surface.widget,
      "editorHoverWidget.border":             surface.border,

      // ── Find widget ───────────────────────────────────────
      "findWidget.background" :               surface.widget,

      // ── Scrollbar ─────────────────────────────────────────
      "scrollbar.shadow":                     "#00000040",
      "scrollbarSlider.background":           neutral.fgDim + "30",
      "scrollbarSlider.hoverBackground":      neutral.fgDim + "50",
      "scrollbarSlider.activeBackground":     neutral.fgDim + "70",

      // ── Minimap ───────────────────────────────────────────
      "minimap.background":                   surface.bg,

      // ── Error / warning squiggles ─────────────────────────
      "editorError.foreground":               "#e06c75",
      "editorWarning.foreground":             "#d4a853",
      "editorInfo.foreground":                "#6fafc4",

      // ── Overview ruler ────────────────────────────────────
      "editorOverviewRuler.errorForeground":  "#e06c7580",
      "editorOverviewRuler.warningForeground":"#d4a85380",
      "editorOverviewRuler.infoForeground":   "#6fafc480",
      "editorOverviewRuler.border":           surface.border,

      // ── Folding controls ──────────────────────────────────
      "editorGutter.foldingControlForeground":neutral.fgDim,

      // ── Word highlight ────────────────────────────────────
      "editor.wordHighlightBackground":       surface.selection + "60",
      "editor.wordHighlightStrongBackground": surface.selection + "90",

      // ── Lightbulb ─────────────────────────────────────────
      "editorLightBulb.foreground":           "#d4a853",

      // ── Input inside widgets ──────────────────────────────
      "input.background":                     surface.inputBg,
      "input.border":                         surface.inputBdr,
      "input.foreground":                     neutral.fg,
      "inputOption.activeBorder":             "#6fafc4",

      // ── Context menu ──────────────────────────────────────
      "menu.background":                      surface.widget,
      "menu.foreground":                      neutral.fg,
      "menu.selectionBackground":             surface.selection,
      "menu.selectionForeground":             neutral.fgBright,
      "menu.border":                          surface.border,

      // ── Focus border ──────────────────────────────────────
      "focusBorder":                          "#6fafc460",
    },
  };
}


// ---------------------------------------------------------------------------
// Quick-fix builder (unchanged logic)
// ---------------------------------------------------------------------------

function buildQuickFix(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  issue: ValidationIssue,
): Monaco.languages.CodeAction | null {
  const lineContent = model.getLineContent(issue.line);
  const lineMaxCol = model.getLineMaxColumn(issue.line);

  switch (issue.fixId) {
    case "close-comment": {
      return {
        title: "Close comment with -->",
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, lineMaxCol, issue.line, lineMaxCol),
              text: " -->",
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    case "escape-ampersand": {
      const ampIdx = lineContent.search(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/);
      if (ampIdx === -1) return null;
      const col = ampIdx + 1;
      return {
        title: "Replace & with &amp;",
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, col, issue.line, col + 1),
              text: "&amp;",
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    case "quote-attribute": {
      const attr = issue.fixData?.attr;
      const value = issue.fixData?.value;
      if (!attr || !value) return null;
      const searchStr = `${attr}=${value}`;
      const idx = lineContent.indexOf(searchStr);
      if (idx === -1) return null;
      const valStart = idx + attr.length + 1;
      const col = valStart + 1;
      return {
        title: `Quote attribute value: ${attr}="${value}"`,
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, col, issue.line, col + value.length),
              text: `"${value}"`,
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    case "close-tag": {
      const tag = issue.fixData?.tag;
      if (!tag) return null;
      const indent = lineContent.match(/^(\s*)/)?.[1] ?? "";
      return {
        title: `Insert closing </${tag}>`,
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, lineMaxCol, issue.line, lineMaxCol),
              text: `\n${indent}</${tag}>`,
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    case "fix-closing-tag": {
      const expected = issue.fixData?.expected;
      const found = issue.fixData?.found;
      if (!expected || !found) return null;
      const closingStr = `</${found}>`;
      const idx = lineContent.indexOf(closingStr);
      if (idx === -1) return null;
      const col = idx + 1;
      return {
        title: `Fix closing tag: </${found}> → </${expected}>`,
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, col, issue.line, col + closingStr.length),
              text: `</${expected}>`,
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    case "remove-stray-text": {
      return {
        title: "Remove this line",
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, 1, issue.line + 1, 1),
              text: "",
            },
            versionId: model.getVersionId(),
          }],
        },
      };
    }

    case "remove-duplicate-attr": {
      const attr = issue.fixData?.attr;
      if (!attr) return null;
      const attrRegex = new RegExp(`\\s${attr}\\s*=\\s*(?:"[^"]*"|'[^']*')`, "g");
      let m;
      let count = 0;
      let removeStart = -1;
      let removeEnd = -1;
      while ((m = attrRegex.exec(lineContent)) !== null) {
        count++;
        if (count === 2) {
          removeStart = m.index;
          removeEnd = m.index + m[0].length;
          break;
        }
      }
      if (removeStart === -1) return null;
      return {
        title: `Remove duplicate "${attr}" attribute`,
        kind: "quickfix",
        diagnostics: [],
        edit: {
          edits: [{
            resource: model.uri,
            textEdit: {
              range: new monaco.Range(issue.line, removeStart + 1, issue.line, removeEnd + 1),
              text: "",
            },
            versionId: model.getVersionId(),
          }],
        },
        isPreferred: true,
      };
    }

    default:
      return null;
  }
}


// ---------------------------------------------------------------------------
// Pretty-print XML utility
// ---------------------------------------------------------------------------

function prettyPrintXml(xml: string): string {
  let formatted = "";
  let indent = 0;
  const tab = "  ";
  const lines = xml
    .replace(/(>)\s*(<)/g, "$1\n$2")
    .split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("</")) {
      indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + line + "\n";
    } else if (line.startsWith("<?")) {
      formatted += line + "\n";
    } else if (line.endsWith("/>")) {
      formatted += tab.repeat(indent) + line + "\n";
    } else if (line.startsWith("<") && !line.startsWith("<!--")) {
      const hasClosing = /<\/[^>]+>\s*$/.test(line);
      formatted += tab.repeat(indent) + line + "\n";
      if (!hasClosing) indent++;
    } else {
      formatted += tab.repeat(indent) + line + "\n";
    }
  }

  return formatted.trimEnd();
}


// ---------------------------------------------------------------------------
// Label map for meta file types
// ---------------------------------------------------------------------------

const META_LABELS: Record<MetaFileType, string> = {
  handling: "handling.meta",
  vehicles: "vehicles.meta",
  carcols: "carcols.meta",
  carvariations: "carvariations.meta",
  vehiclelayouts: "vehiclelayouts.meta",
  modkits: "modkits.meta",
};


// ---------------------------------------------------------------------------
// EditorHeader sub-component
// ---------------------------------------------------------------------------

interface EditorHeaderProps {
  activeTab: MetaFileType;
  filePath: string | null;
  editorEditMode: boolean;
  wordWrap: boolean;
  errorCount: number;
  warningCount: number;
  lineCount: number;
  onToggleEditMode: () => void;
  onToggleWrap: () => void;
  onFormat: () => void;
  onFocusSearch: () => void;
  onCopyContent: () => void;
  onFoldAll: () => void;
  onUnfoldAll: () => void;
}

function EditorHeader({
  activeTab,
  filePath,
  editorEditMode,
  wordWrap,
  errorCount,
  warningCount,
  lineCount,
  onToggleEditMode,
  onToggleWrap,
  onFormat,
  onFocusSearch,
  onCopyContent,
  onFoldAll,
  onUnfoldAll,
}: EditorHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyContent();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const breadcrumb = useMemo(() => {
    if (!filePath) return null;
    const parts = filePath.replace(/\\/g, "/").split("/");
    if (parts.length <= 1) return null;
    return parts[parts.length - 2];
  }, [filePath]);

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between h-8 px-2.5 border-b border-[#131a2b] bg-[#060e27] select-none shrink-0">
        {/* Left: file name + path crumb */}
        <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
          {breadcrumb && (
            <>
              <span className="text-muted-foreground/60 truncate max-w-[120px]">{breadcrumb}</span>
              <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
            </>
          )}
          <span className="text-[#dbe8ff] font-medium truncate">{META_LABELS[activeTab]}</span>

          {/* Language badge */}
          <span className="ml-1.5 px-1.5 py-px rounded text-[9px] uppercase tracking-wider bg-[#14233b] text-[#5d7a9b] border border-[#2a3f60]/50">
            XML
          </span>

          {/* Line count */}
          <span className="ml-1 text-[10px] text-muted-foreground/50">
            {lineCount} lines
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-0.5">
          {/* Diagnostics summary */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-1.5 mr-1.5 text-[10px]">
              {errorCount > 0 && (
                <span className="flex items-center gap-0.5 text-[#e06c75]">
                  <AlertCircle className="size-3" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-0.5 text-[#d4a853]">
                  <AlertTriangle className="size-3" />
                  {warningCount}
                </span>
              )}
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  editorEditMode && "text-primary bg-primary/10",
                )}
                onClick={onToggleEditMode}
              >
                {editorEditMode ? <PencilLine className="size-3" /> : <Eye className="size-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{editorEditMode ? "Switch to read-only" : "Enable editing"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  wordWrap && "text-[#dbe8ff]",
                )}
                onClick={onToggleWrap}
              >
                <WrapText className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{wordWrap ? "Disable word wrap" : "Enable word wrap"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={onFormat}
              >
                <Indent className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Format XML</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={onFoldAll}
              >
                <ChevronsDownUp className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fold all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={onUnfoldAll}
              >
                <ChevronsUpDown className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Unfold all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={onFocusSearch}
              >
                <Search className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Find (Ctrl+F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  copied && "text-[#5a9b6b]",
                )}
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{copied ? "Copied!" : "Copy XML"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}


// ---------------------------------------------------------------------------
// CodePreview – main component
// ---------------------------------------------------------------------------

export function CodePreview() {
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const editorEditMode = useMetaStore((s) => s.editorEditMode);
  const toggleEditorEditMode = useMetaStore((s) => s.toggleEditorEditMode);
  const replaceVehiclesFromEditor = useMetaStore((s) => s.replaceVehiclesFromEditor);
  const filePath = useMetaStore((s) => s.filePath);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const issuesRef = useRef<ValidationIssue[]>([]);
  const providerRef = useRef<Monaco.IDisposable | null>(null);

  const [wordWrap, setWordWrap] = useState(true);
  const [lineCount, setLineCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  const [xmlContent, setXmlContent] = useState(() => {
    const vehicleList = Object.values(vehicles);
    if (vehicleList.length === 0) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- No vehicles loaded. Add a vehicle or import a .meta file to get started. -->`;
    }
    return serializeActiveTab(activeTab, vehicleList);
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedValueRef = useRef<string>("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const vehicleList = Object.values(vehicles);
      if (vehicleList.length === 0) {
        setXmlContent(`<?xml version="1.0" encoding="UTF-8"?>\n<!-- No vehicles loaded. Add a vehicle or import a .meta file to get started. -->`);
      } else {
        setXmlContent(serializeActiveTab(activeTab, vehicleList));
      }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [vehicles, activeTab]);

  // Track line count
  useEffect(() => {
    setLineCount(xmlContent.split("\n").length);
  }, [xmlContent]);

  const runValidation = useCallback((content: string) => {
    const validation = validateMetaXml(content);

    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return validation;

    const model = editor.getModel();
    if (!model) return validation;

    const { issues } = validation;
    issuesRef.current = issues;

    let errors = 0;
    let warnings = 0;

    const markers: Monaco.editor.IMarkerData[] = issues.map((issue) => {
      const sev = issue.severity === "error"
        ? monaco.MarkerSeverity.Error
        : monaco.MarkerSeverity.Warning;
      if (issue.severity === "error") errors++;
      else warnings++;
      return {
        severity: sev,
        message: issue.message,
        startLineNumber: issue.line,
        startColumn: issue.column ?? 1,
        endLineNumber: issue.line,
        endColumn: model.getLineMaxColumn(issue.line),
      };
    });

    setErrorCount(errors);
    setWarningCount(warnings);

    monaco.editor.setModelMarkers(model, "xml-validator", markers);
    return validation;
  }, []);

  // Register theme before editor mounts
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme(THEME_NAME, buildThemeData());
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register CodeActionProvider for quick fixes
    providerRef.current = monaco.languages.registerCodeActionProvider("xml", {
      provideCodeActions(
        model: Monaco.editor.ITextModel,
        range: Monaco.Range,
      ) {
        const actions: Monaco.languages.CodeAction[] = [];
        const issues = issuesRef.current;

        for (const issue of issues) {
          if (!issue.fixId) continue;
          if (issue.line < range.startLineNumber || issue.line > range.endLineNumber) continue;

          const fix = buildQuickFix(monaco, model, issue);
          if (fix) {
            fix.diagnostics = monaco.editor
              .getModelMarkers({ resource: model.uri })
              .filter(
                (m: Monaco.editor.IMarkerData) =>
                  m.startLineNumber === issue.line &&
                  m.message === issue.message
              );
            actions.push(fix);
          }
        }

        return { actions, dispose() {} };
      },
    });

    runValidation(editor.getValue());
  }, [runValidation]);

  // Dispose provider on unmount
  useEffect(() => {
    return () => {
      providerRef.current?.dispose();
      if (applyDebounceRef.current) {
        clearTimeout(applyDebounceRef.current);
      }
    };
  }, []);

  // Re-validate whenever content changes (from serializer)
  useEffect(() => {
    runValidation(xmlContent);
  }, [xmlContent, runValidation]);

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !editorEditMode) return;

    const validation = runValidation(value);
    if (!validation.valid) return;

    if (applyDebounceRef.current) {
      clearTimeout(applyDebounceRef.current);
    }

    applyDebounceRef.current = setTimeout(() => {
      if (lastAppliedValueRef.current === value) return;

      const detectedType = detectMetaType(value);
      if (detectedType && detectedType !== activeTab) {
        return;
      }

      const parseDiagnostics: ParseDiagnostic[] = [];

      try {
        const parsed = parseMetaFile(value, vehicles, undefined, {
          diagnostics: parseDiagnostics,
          sourcePath: "direct-edit",
        });

        const hasParseErrors = parseDiagnostics.some((diagnostic) => diagnostic.severity === "error");
        if (hasParseErrors) return;

        const parsedVehicles = Object.values(parsed);
        const hasActiveTabData = parsedVehicles.some((vehicle) => vehicle.loadedMeta.has(activeTab));

        if (parsedVehicles.length === 0 || !hasActiveTabData) {
          return;
        }

        replaceVehiclesFromEditor(parsed);
        lastAppliedValueRef.current = value;
      } catch {
        // Ignore parse errors while user is typing
      }
    }, 250);
  };

  // ── Header action handlers ───────────────────────────────────────────

  const handleToggleWrap = useCallback(() => {
    setWordWrap((prev) => {
      const next = !prev;
      editorRef.current?.updateOptions({ wordWrap: next ? "on" : "off" });
      return next;
    });
  }, []);

  const handleFormat = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const raw = model.getValue();
    const formatted = prettyPrintXml(raw);
    model.setValue(formatted);
  }, []);

  const handleFocusSearch = useCallback(() => {
    editorRef.current?.getAction("actions.find")?.run();
  }, []);

  const handleCopyContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const content = editor.getValue();
    navigator.clipboard.writeText(content).catch(() => {
      editor.getAction("editor.action.clipboardCopyAction")?.run();
    });
  }, []);

  const handleFoldAll = useCallback(() => {
    editorRef.current?.getAction("editor.foldAll")?.run();
  }, []);

  const handleUnfoldAll = useCallback(() => {
    editorRef.current?.getAction("editor.unfoldAll")?.run();
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#050d21] overflow-hidden">
      {/* Editor chrome header */}
      <EditorHeader
        activeTab={activeTab}
        filePath={filePath}
        editorEditMode={editorEditMode}
        wordWrap={wordWrap}
        errorCount={errorCount}
        warningCount={warningCount}
        lineCount={lineCount}
        onToggleEditMode={toggleEditorEditMode}
        onToggleWrap={handleToggleWrap}
        onFormat={handleFormat}
        onFocusSearch={handleFocusSearch}
        onCopyContent={handleCopyContent}
        onFoldAll={handleFoldAll}
        onUnfoldAll={handleUnfoldAll}
      />

      {/* Edit mode indicator bar */}
      {editorEditMode && (
        <div className="flex items-center gap-1.5 h-6 px-2.5 bg-[#0b1424] border-b border-[#131a2b] text-[10px] shrink-0">
          <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-medium uppercase tracking-wider text-primary/80">Edit Mode</span>
          <span className="text-muted-foreground/50">— changes apply to workspace in real-time</span>
        </div>
      )}

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="xml"
          theme={THEME_NAME}
          value={xmlContent}
          onChange={editorEditMode ? handleEditorChange : undefined}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            readOnly: !editorEditMode,
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            fontLigatures: false,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: wordWrap ? "on" : "off",
            automaticLayout: true,
            renderLineHighlight: "line",
            renderLineHighlightOnlyWhenFocus: !editorEditMode,
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "mouseover",
            padding: { top: 6, bottom: 6 },
            cursorStyle: editorEditMode ? "line" : "line-thin",
            cursorBlinking: editorEditMode ? "smooth" : "solid",
            cursorWidth: editorEditMode ? 2 : 1,
            glyphMargin: true,
            lightbulb: { enabled: "on" as unknown as Monaco.editor.ShowLightbulbIconMode },
            // Bracket matching & guides
            matchBrackets: "always",
            bracketPairColorization: { enabled: false },
            guides: {
              indentation: true,
              highlightActiveIndentation: true,
              bracketPairs: true,
              bracketPairsHorizontal: false,
            },
            // Scrollbar
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              verticalSliderSize: 8,
              useShadows: false,
            },
            // Selection
            roundedSelection: false,
            renderWhitespace: "none",
            // Smoothing
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            // Sticky scroll for XML node hierarchy
            stickyScroll: { enabled: true, maxLineCount: 3 },
          }}
        />
      </div>
    </div>
  );
}

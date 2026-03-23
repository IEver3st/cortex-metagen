import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useMetaStore } from "@/store/meta-store";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { parseMetaFile } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";

const MONACO_THEME_NAME = "cortex-metagen-inset";

const monacoTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "tag", foreground: "7DD3FC" },
    { token: "delimiter", foreground: "6EE7F9" },
    { token: "attribute.name", foreground: "F59E0B" },
    { token: "attribute.value", foreground: "86EFAC" },
    { token: "string", foreground: "86EFAC" },
    { token: "comment", foreground: "60708A", fontStyle: "italic" },
  ],
  colors: {
    "editor.background": "#08101c",
    "editor.foreground": "#C8D5EC",
    "editor.lineHighlightBackground": "#0C1929",
    "editor.lineHighlightBorder": "#0E1E35",
    "editor.selectionBackground": "#12324B",
    "editor.inactiveSelectionBackground": "#0D2538",
    "editorCursor.foreground": "#67E8F9",
    "editorIndentGuide.background1": "#0E1c30",
    "editorIndentGuide.activeBackground1": "#1c3a58",
    "editorLineNumber.foreground": "#3a5272",
    "editorLineNumber.activeForeground": "#8faabb",
    "editorGutter.background": "#07101a",
    "editorBracketMatch.background": "#133A53",
    "editorBracketMatch.border": "#4CC9F0",
    "editorOverviewRuler.border": "#00000000",
    "editorWidget.background": "#07101e",
    "editorWidget.border": "#17304d",
    "editorSuggestWidget.background": "#091320",
    "editorSuggestWidget.border": "#1A3049",
    "editorSuggestWidget.selectedBackground": "#10243A",
    "editorHoverWidget.background": "#0A1524",
    "editorHoverWidget.border": "#203754",
    "scrollbarSlider.background": "#1A2B42AA",
    "scrollbarSlider.hoverBackground": "#23405FBB",
    "scrollbarSlider.activeBackground": "#31597FCC",
  },
};

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

export function CodePreview() {
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const editorEditMode = useMetaStore((s) => s.editorEditMode);
  const replaceVehiclesFromEditor = useMetaStore((s) => s.replaceVehiclesFromEditor);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const issuesRef = useRef<ValidationIssue[]>([]);
  const providerRef = useRef<Monaco.IDisposable | null>(null);
  const [xmlContent, setXmlContent] = useState(() => {
    const vehicleList = Object.values(vehicles);
    if (vehicleList.length === 0) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- No vehicles loaded. Add a vehicle or import a .meta file to get started. -->`;
    }
    return serializeActiveTab(activeTab, vehicleList);
  });
  const [validationSummary, setValidationSummary] = useState(() =>
    validateMetaXml(xmlContent).issues.reduce(
      (acc, issue) => {
        if (issue.severity === "error") acc.errors++;
        else acc.warnings++;
        return acc;
      },
      { errors: 0, warnings: 0 },
    ),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = useCallback((content: string) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const { issues } = validateMetaXml(content);
    issuesRef.current = issues;
    setValidationSummary(
      issues.reduce(
        (acc, issue) => {
          if (issue.severity === "error") acc.errors++;
          else acc.warnings++;
          return acc;
        },
        { errors: 0, warnings: 0 },
      ),
    );

    const markers: Monaco.editor.IMarkerData[] = issues.map((issue) => ({
      severity:
        issue.severity === "error"
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      message: issue.message,
      startLineNumber: issue.line,
      startColumn: issue.column ?? 1,
      endLineNumber: issue.line,
      endColumn: model.getLineMaxColumn(issue.line),
    }));

    monaco.editor.setModelMarkers(model, "xml-validator", markers);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const vehicleList = Object.values(vehicles);
      const nextContent = vehicleList.length === 0
        ? `<?xml version="1.0" encoding="UTF-8"?>\n<!-- No vehicles loaded. Add a vehicle or import a .meta file to get started. -->`
        : serializeActiveTab(activeTab, vehicleList);

      setXmlContent(nextContent);
      runValidation(nextContent);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [vehicles, activeTab, runValidation]);

  const handleBeforeMount = useCallback((monaco: typeof Monaco) => {
    monaco.editor.defineTheme(MONACO_THEME_NAME, monacoTheme);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme(MONACO_THEME_NAME);

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

  useEffect(() => {
    return () => {
      providerRef.current?.dispose();
    };
  }, []);

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !editorEditMode) return;

    runValidation(value);
    setValidationSummary(
      validateMetaXml(value).issues.reduce(
        (acc, issue) => {
          if (issue.severity === "error") acc.errors++;
          else acc.warnings++;
          return acc;
        },
        { errors: 0, warnings: 0 },
      ),
    );

    try {
      const parsed = parseMetaFile(value, vehicles);
      if (Object.keys(parsed).length > 0) {
        replaceVehiclesFromEditor(parsed);
      }
    } catch {
      // Ignore parse errors while user is typing
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#050c16]">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#0f1e32] bg-[#07101c] px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-100/60">
            {activeTab}.meta
          </span>
          {editorEditMode && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400/70">
              edit
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {validationSummary.errors > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-400" />
              <span className="font-mono text-[10px] text-rose-400/80">
                {validationSummary.errors}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400/70" />
              <span className="font-mono text-[10px] text-emerald-400/70">ok</span>
            </div>
          )}
          {validationSummary.warnings > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span className="font-mono text-[10px] text-amber-400/80">
                {validationSummary.warnings}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-[5px]">
        <div className="relative h-full overflow-hidden rounded-[4px] border border-[#0f1e32] bg-[#08101c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
          <Editor
            beforeMount={handleBeforeMount}
            height="100%"
            language="xml"
            theme={MONACO_THEME_NAME}
            value={xmlContent}
            onChange={editorEditMode ? handleEditorChange : undefined}
            onMount={handleMount}
            options={{
              readOnly: !editorEditMode,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'Share Tech Mono', 'Courier New', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              renderLineHighlight: editorEditMode ? "line" : "none",
              folding: true,
              padding: { top: 10, bottom: 14 },
              cursorStyle: editorEditMode ? "line" : "line-thin",
              cursorBlinking: editorEditMode ? "blink" : "solid",
              glyphMargin: true,
              lightbulb: { enabled: "on" as unknown as Monaco.editor.ShowLightbulbIconMode },
              smoothScrolling: true,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

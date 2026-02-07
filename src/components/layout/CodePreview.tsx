import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useMetaStore } from "@/store/meta-store";
import { serializeActiveTab } from "@/lib/xml-serializer";
import { parseMetaFile } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";

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
      // Find the second occurrence of attr="..." or attr='...'
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
  const loadVehicles = useMetaStore((s) => s.loadVehicles);

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const runValidation = useCallback((content: string) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const { issues } = validateMetaXml(content);
    issuesRef.current = issues;

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
    };
  }, []);

  // Re-validate whenever content changes (from serializer)
  useEffect(() => {
    runValidation(xmlContent);
  }, [xmlContent, runValidation]);

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !editorEditMode) return;

    runValidation(value);

    try {
      const parsed = parseMetaFile(value, vehicles);
      if (Object.keys(parsed).length > 0) {
        loadVehicles(parsed);
      }
    } catch {
      // Ignore parse errors while user is typing
    }
  };

  return (
    <div className="h-full w-full relative">
      {editorEditMode && (
        <div className="absolute top-1 right-3 z-10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          Edit Mode
        </div>
      )}
      <Editor
        height="100%"
        language="xml"
        theme="vs-dark"
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
          padding: { top: 8 },
          cursorStyle: editorEditMode ? "line" : "line-thin",
          cursorBlinking: editorEditMode ? "blink" : "solid",
          glyphMargin: true,
          lightbulb: { enabled: "on" as unknown as Monaco.editor.ShowLightbulbIconMode },
        }}
      />
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useMetaStore } from "@/store/meta-store";
import { parseMetaFile, detectMetaType } from "@/lib/xml-parser";
import { validateMetaXml, type ValidationIssue } from "@/lib/xml-validator";
import { serializeActiveTab } from "@/lib/xml-serializer";

function App() {
  const loadVehicles = useMetaStore((s) => s.loadVehicles);
  const vehicles = useMetaStore((s) => s.vehicles);
  const activeTab = useMetaStore((s) => s.activeTab);
  const setActiveTab = useMetaStore((s) => s.setActiveTab);
  const setFilePath = useMetaStore((s) => s.setFilePath);
  const markClean = useMetaStore((s) => s.markClean);

  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [validationFileName, setValidationFileName] = useState<string>("");

  const handleOpenFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
      });
      if (!selected) return;
      const filePath = typeof selected === "string" ? selected : selected;
      const { invoke } = await import("@tauri-apps/api/core");
      const content = await invoke<string>("read_meta_file", {
        path: filePath,
      });

      // Validate the XML before parsing
      const validation = validateMetaXml(content);
      const fileName = (filePath as string).split(/[/\\]/).pop() ?? "";
      setValidationFileName(fileName);
      setValidationIssues(validation.issues);

      // Still parse even with warnings — only block on critical parse failure
      const metaType = detectMetaType(content, fileName);
      const parsed = parseMetaFile(content, vehicles, fileName);
      loadVehicles(parsed);
      if (metaType) setActiveTab(metaType);
      setFilePath(filePath as string);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [vehicles, loadVehicles, setActiveTab, setFilePath]);

  const handleSaveFile = useCallback(async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const filePath = await save({
        filters: [{ name: "Meta Files", extensions: ["meta", "xml"] }],
        defaultPath: `${activeTab}.meta`,
      });
      if (!filePath) return;
      const vehicleList = Object.values(vehicles);
      const content = serializeActiveTab(activeTab, vehicleList);
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("write_meta_file", { path: filePath, content });
      setFilePath(filePath);
      markClean();
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [vehicles, activeTab, setFilePath, markClean]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenFile, handleSaveFile]);

  return (
    <AppShell
      onOpenFile={handleOpenFile}
      onSaveFile={handleSaveFile}
      validationIssues={validationIssues}
      validationFileName={validationFileName}
      onDismissValidation={() => setValidationIssues([])}
    />
  );
}

export default App;

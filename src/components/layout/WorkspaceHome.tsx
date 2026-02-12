import { useState } from "react";
import { motion } from "motion/react";
import { Folder, Plus, ArrowUpRight } from "lucide-react";
import { HiOutlineCode } from "react-icons/hi";

import { GenerateProjectDialog } from "@/components/layout/GenerateProjectDialog";

interface WorkspaceHomeProps {
  onOpenFolder?: () => void;
  onOpenFile?: () => void;
  onOpenRecentFile?: (path: string) => void;
  onOpenRecentWorkspace?: (path: string) => void;
  recentFiles: string[];
  recentWorkspaces: string[];
  workspacePath?: string | null;
}

function getBaseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

function trimPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.length <= 40) return normalized;
  return `...${normalized.slice(-40)}`;
}

export function WorkspaceHome({
  onOpenFolder,
  onOpenRecentWorkspace,
  recentWorkspaces,
}: WorkspaceHomeProps) {
  const recent = recentWorkspaces.slice(0, 5);
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <div className="relative h-full overflow-hidden bg-[#040d1a] text-slate-100 flex items-center justify-center">
      {/* Background Decorative Element (Subtle Gradient) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040d1a] via-[#06152a] to-[#040d1a] opacity-50 pointer-events-none" />
      
      <div className="relative w-full max-w-4xl px-8 py-12 flex flex-col md:flex-row gap-12 md:gap-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Left Column: Start */}
        <div className="flex-1 space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <HiOutlineCode className="h-9 w-9 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-white">METAGEN</h1>
            </div>
          </motion.div>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Start</p>
              
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenFolder}
                  className="group flex items-center gap-3 w-full max-w-sm p-3 rounded-lg bg-[#0052cc] hover:bg-[#0066ff] transition-all shadow-lg shadow-blue-900/20"
                >
                  <div className="p-1.5 rounded-md bg-white/20">
                    <Folder className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white">Open Folder</p>
                  </div>
                </motion.button>

                <div className="space-y-0.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setGenerateOpen(true)}
                    className="flex items-center gap-2.5 w-full p-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-slate-300 group text-sm"
                  >
                    <Plus className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                    <span className="font-medium">Generate a New Project</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Projects */}
        <div className="flex-1 space-y-4 max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Recent Projects</p>
            
            <div className="space-y-2">
              {recent.length === 0 ? (
                <div className="p-6 rounded-lg border border-white/5 bg-white/[0.02] text-center">
                  <p className="text-slate-500 text-xs text-center mx-auto">No recent projects found</p>
                </div>
              ) : (
                recent.map((path) => (
                  <motion.button
                    key={path}
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                    onClick={() => onOpenRecentWorkspace?.(path)}
                    className="flex items-center justify-between w-full p-3 rounded-lg border border-white/5 bg-white/[0.02] text-left transition-all group"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                        {getBaseName(path)}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {trimPath(path)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                  </motion.button>
                ))
              )}
            </div>

            {recent.length > 0 && (
              <button className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors ml-1">
                Show More...
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none opacity-20">
        <p className="text-[10px] uppercase tracking-[0.5em] text-slate-400">Cortex by Ever3st</p>
      </div>

      {/* Decorative lines at the bottom right like in the image */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="20" y1="100" x2="120" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="40" y1="100" x2="140" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      <GenerateProjectDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}

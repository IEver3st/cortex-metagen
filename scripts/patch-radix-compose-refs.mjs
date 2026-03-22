/**
 * Patches @radix-ui/react-compose-refs to fix an infinite re-render loop
 * with React 19. The original `useComposedRefs` creates a new callback via
 * `useCallback(composeRefs(...refs), refs)` whenever any ref changes identity.
 * React 19 re-invokes ref callbacks when their identity changes, which causes
 * an infinite loop when Radix components pass inline arrow setState functions
 * as refs (e.g. `(node) => setButton(node)` in Switch, ScrollArea, etc.).
 *
 * Fix: store refs in a mutable ref and return a stable callback that always
 * reads the latest refs, so the composed ref identity never changes.
 *
 * This runs as a postinstall script and is idempotent.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PATCHED_MARKER = "stableComposedRef";
const ORIGINAL = "return React.useCallback(composeRefs(...refs), refs);";

function patchedCode(isESM) {
  const reactRef = isESM ? "React" : "React";
  return [
    `var refsRef = ${reactRef}.useRef(refs);`,
    `  refsRef.current = refs;`,
    `  return ${reactRef}.useCallback(function stableComposedRef(node) {`,
    `    return composeRefs.apply(null, refsRef.current)(node);`,
    `  }, []);`,
  ].join("\n");
}

function patchFile(filePath, isESM) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");

  // Already patched
  if (content.includes(PATCHED_MARKER)) {
    return;
  }

  if (!content.includes(ORIGINAL)) {
    console.warn(`[patch-radix] Unexpected content in ${filePath}, skipping`);
    return;
  }

  const patched = content.replace(ORIGINAL, patchedCode(isESM));
  writeFileSync(filePath, patched, "utf8");
  console.log(`[patch-radix] Patched ${filePath}`);
}

const base = join("node_modules", "@radix-ui", "react-compose-refs", "dist");
patchFile(join(base, "index.mjs"), true);
patchFile(join(base, "index.js"), false);

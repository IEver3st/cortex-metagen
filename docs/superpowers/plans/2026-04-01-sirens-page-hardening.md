# Sirens Page Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the sirens editor simplified while fixing broken `carcols.meta` siren parsing/saving behavior and preserving common legacy siren data.

**Architecture:** Add focused parser/serializer regression coverage for real-world siren XML, then harden the `carcols` types and editor so simplified fields map cleanly while unsupported siren nodes survive round-trips. Preserve existing in-flight work in adjacent files and avoid broad refactors.

**Tech Stack:** Bun test runner, React 19, TypeScript 5.9, Zustand, fast-xml-parser

---

### Task 1: Lock Down Current Siren Regressions

**Files:**
- Create: `docs/superpowers/plans/2026-04-01-sirens-page-hardening.md`
- Create: `carcols-meta.test.ts`
- Modify: `src/lib/xml-parser.ts`
- Modify: `src/lib/xml-serializer.ts`

- [ ] **Step 1: Write failing siren regression tests**
- [ ] **Step 2: Run the siren tests and confirm the current failures**
- [ ] **Step 3: Patch parser/serializer behavior to satisfy the tested real-world siren cases**
- [ ] **Step 4: Re-run the siren tests and confirm they pass**

### Task 2: Keep The Editor Simplified While Surfacing Practical Gaps

**Files:**
- Modify: `src/store/meta-store.ts`
- Modify: `src/lib/presets.ts`
- Modify: `src/components/editors/CarcolsEditor.tsx`

- [ ] **Step 1: Extend the simplified `carcols` model only for practical siren fields**
- [ ] **Step 2: Update the sirens page UI to expose the supported fields and preserved-legacy warning state**
- [ ] **Step 3: Verify the editor still behaves cleanly for new and imported siren entries**

### Task 3: Verify And Release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.lock`

- [ ] **Step 1: Run targeted tests and lint/build checks that cover the sirens flow**
- [ ] **Step 2: Bump versions consistently for a patch release**
- [ ] **Step 3: Run `bun run version:check`**

# METAGEN docs (Fumadocs content)

This folder contains **Fumadocs-compatible** documentation content for Cortex METAGEN.

## Content location

The docs pages live under:

- `docs/content/docs/`

They are written as MDX/Markdown and use Fumadocs conventions:

- `index.mdx` for section index pages
- `meta.json` for sidebar order, grouping, and titles

## How to render these docs

This repository is a Vite + Tauri app and does **not** currently include a Fumadocs website.

To render these docs, you have two common options:

### Option A: Create a separate Fumadocs site

1. Create a Fumadocs app (template of your choice)
2. Point its content directory to `docs/content/docs`
3. Run the docs site

### Option B: Integrate Fumadocs MDX into this repo (advanced)

Fumadocs MDX supports Vite, but wiring a docs UI into this app is a larger change.

If you want, tell me:

- whether you want the docs as a separate site or inside this Tauri app
- what route you want (e.g. `/docs`)

…and I can set up the plumbing.

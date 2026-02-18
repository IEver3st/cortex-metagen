# Cortex Metagen - Feature Requirements

## 1) Linked Modkits -> Linked Mods Generation

### Goal
Allow users to define linked modkits in a higher-level UI and auto-generate valid `linkedMods` entries.

### Requirements
- User can type/create a linked modkit entry in the modkit editor.
- On creation/edit, prompt the user to choose the referenced bone (or manually enter bone name).
- App auto-generates the corresponding `linkedMods` block from this input.
- Generated entries appear in the correct section order in output XML.
- User can still manually edit generated entries after creation.

### Acceptance Criteria
- Creating one linked modkit with a selected bone creates one valid linked mod entry.
- Generated XML remains schema-valid for modkits.
- Re-opening the file preserves the linked relationship and selected bone.

---

## 2) Multiple Modkits with Same Base Name

### Goal
Create one base modkit and automatically duplicate it with incremented suffixes.

### Requirements
- Add a toggle: "Create multiple variants".
- When enabled, prompt for quantity.
- Generated names use suffix format: `<base>_1`, `<base>_2`, ... `<base>_N`.
- All generated modkits are created as separate editable records.

### Acceptance Criteria
- Quantity `N` creates exactly `N` new modkits.
- Names are unique and collision-safe.
- If a name already exists, app resolves conflict deterministically (e.g., next available suffix).

---

## 3) Individual Editing of Generated Modkits

### Goal
Generated modkits must be editable one-by-one with granular control.

### Requirements
- Display generated modkits as separate sections/items in the UI.
- Each section supports independent edits without forcing batch updates.
- Changes reflect instantly in preview/output for the selected item only.

### Acceptance Criteria
- Editing one generated modkit does not mutate sibling modkits unless user explicitly batch-edits.
- Each generated modkit can be renamed, removed, or modified independently.

---

## 4) Modkit Type + SlotName Rename Flow

### Goal
Support guided rename behavior for eligible modkits using slot names.

### Requirements
- When user sets modkit type, app evaluates rename eligibility.
- Only original (non-Bennys) modkits can be renamed.
- If eligible, prompt user:
	- "Rename this modkit?"
	- If yes, ask for new name via text input.
- Store and serialize renamed value correctly.

### Acceptance Criteria
- Eligible types trigger rename prompt.
- Ineligible types do not allow rename and show clear reason.
- Saved XML contains renamed value only where allowed.

---

## 5) META Merging (Dedicated Workflow)

### Goal
Provide a dedicated merge tool to combine multiple meta files into one cleaned output.

### Requirements
- Add a dedicated "Meta Merging" section/view.
- Support drag-and-drop for multiple files.
- Merge files by type (e.g., `handling.meta` + `handling.meta`, `vehicles.meta` + `vehicles.meta`).
- Preserve inline comments used for section separators when possible (e.g., `<!-- SIREN 18 -->`).
- Output one final merged file.

### Deduplication Rules
- Avoid duplicate logical entries during merge.
- Handling example: if 4 vehicles reference only 2 unique handling definitions, output only 2 handling entries.
- Siren/layout example: if 20 vehicles use same siren layout ID, merge to one unique siren/layout definition (not 20 duplicates).

### Acceptance Criteria
- Merging duplicate-heavy inputs does not produce repeated identical definitions.
- Output is valid XML and import-ready.
- User gets a merge summary (counts of input entries, unique kept entries, duplicates removed).

---

## 6) Carcols: Coronas + Ground Lighting Focus

### Goal
Improve authoring controls for carcols light behavior and shared IDs.

### Requirements
- Add toggles to enable/disable light coronas per relevant light entry.
- Support workflows where many vehicles share the same light ID and identical properties.
- During merge/generation, deduplicate identical light definitions safely.

### Acceptance Criteria
- Corona toggle updates corresponding serialized values correctly.
- Shared-ID scenarios do not produce repeated identical light definitions.

---

## 7) Suggested Delivery Phases

1. Linked modkits generation + bone prompt.
2. Multi-modkit creation + individual editing.
3. Type-based rename flow.
4. Dedicated meta merge UI + dedupe engine.
5. Carcols coronas/light dedupe enhancements.

---

## References

- GTA Mods Wiki (Carcols): https://gtamods.com/wiki/Carcols.ymt
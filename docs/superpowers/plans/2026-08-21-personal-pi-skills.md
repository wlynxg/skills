# Personal Pi Skills Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Each task has a focused verification checkpoint.

**Goal:** Build a Pi-local personal skills package with adaptive workflow, reviewable delivery, selective upstream synchronization, skill authoring/absorption guidance, and `🐂🐎` session skill status.

**Architecture:** Standard Pi package resources live under `skills/` and `extensions/`. A small extension injects only the adaptive classification policy, handles explicit mode commands, and observes skill usage without modifying third-party packages. A Node standard-library sync script reads `sources/manifest.json`, compares Git baselines, and emits reports without applying changes.

**Tech Stack:** Pi package manifest, Agent Skills `SKILL.md`, Node.js 22 ESM, Git CLI, JSON, Markdown.

**Spec:** `docs/superpowers/specs/2026-08-21-personal-pi-skills-design.md`

## Global Constraints

- Default workflow is risk-based; strict TDD is opt-in for high-risk/regression work.
- Explicit modes are one-request overrides: `快修`, `澄清`, `深度设计`, `只做方案`, `审查` and `/fast`, `/clarify`, `/deep`, `/design`, `/review`.
- Deep work produces a review packet, vertical slices, and verification evidence.
- Upstream sync never overwrites local skills or updates baselines automatically.
- Skill statistics mean observed use, not guaranteed compliance.
- The Pi status icon is `🐂🐎` and third-party Ponytail files remain untouched.

---

### Task 1: Package skeleton and source manifest

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `sources/manifest.json`
- Create: `.gitignore`

- [ ] **Step 1: Add Pi package metadata**

Declare the package as private, ESM, and expose `./skills` plus `./extensions/skills-status.js` through the `pi` manifest.

- [ ] **Step 2: Record upstream mappings**

Register `obra/superpowers` and `DietrichGebert/ponytail` with their current baseline commits. Map the absorbed upstream skill paths to local skills and record adapted/rejected principles.

- [ ] **Step 3: Document install and operating commands**

Explain `pi install /root/skills`, `/reload`, `/skills`, `/sync-skills`, Ponytail status hiding, and the explicit workflow modes.

- [ ] **Step 4: Verify package metadata**

Run: `node -e "const p=require('./package.json'); if (!p.pi?.skills || !p.pi?.extensions) process.exit(1)"`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json README.md sources/manifest.json .gitignore
git commit -m "chore: add personal pi skills package"
```

### Task 2: Adaptive and requirements skills

**Files:**
- Create: `skills/adaptive-workflow/SKILL.md`
- Create: `skills/clarifying-requirements/SKILL.md`

- [ ] **Step 1: Write lightweight rules**

Define fast/normal/deep predicates, explicit overrides, risk-based validation, and the rule that TDD is not default.

- [ ] **Step 2: Add conditional clarification**

Preserve superpowers-style intent discovery while limiting questions and avoiding PRDs for bounded work.

- [ ] **Step 3: Verify frontmatter and behavior terms**

Run: `node scripts/validate-skills.mjs`
Expected: both skill names and descriptions pass Agent Skills constraints; scripts will be added in Task 5 if needed.

- [ ] **Step 4: Commit**

```bash
git add skills/adaptive-workflow skills/clarifying-requirements
git commit -m "feat: add adaptive workflow and requirement clarification skills"
```

### Task 3: Reviewable delivery and skill authoring skills

**Files:**
- Create: `skills/reviewable-delivery/SKILL.md`
- Create: `skills/reviewable-delivery/references/review-packet.md`
- Create: `skills/creating-skills/SKILL.md`
- Create: `skills/creating-skills/references/evaluating-skills.md`

- [ ] **Step 1: Define review packet contract**

Require goal, scope, invariants, risks, vertical slices, verification evidence, and explicit stop points for irreversible boundaries.

- [ ] **Step 2: Define skill creation contract**

Retain discovery optimization, concise progressive disclosure, pressure scenarios, and RED/GREEN/REFACTOR for discipline skills only; do not impose TDD on normal code changes.

- [ ] **Step 3: Verify references are one level deep**

Check every reference is linked directly from its parent `SKILL.md` and no document contains placeholders.

- [ ] **Step 4: Commit**

```bash
git add skills/reviewable-delivery skills/creating-skills
git commit -m "feat: add reviewable delivery and skill authoring guidance"
```

### Task 4: Skill absorption and upstream sync skills

**Files:**
- Create: `skills/absorbing-skills/SKILL.md`
- Create: `skills/syncing-upstream/SKILL.md`

- [ ] **Step 1: Document selective absorption**

Require reading the upstream source, choosing principles rather than copying whole files, recording mapping and local rationale, and validating the resulting skill.

- [ ] **Step 2: Document sync workflow**

Describe baseline/current comparison, diff review, candidate selection, local update, validation, and explicit baseline advancement.

- [ ] **Step 3: Verify source metadata terms**

Check the skills mention `sources/manifest.json`, `scripts/sync-skills.mjs`, baseline, mapping, absorbed, adapted, rejected, and no-overwrite behavior.

- [ ] **Step 4: Commit**

```bash
git add skills/absorbing-skills skills/syncing-upstream
git commit -m "feat: add selective skill absorption and sync guidance"
```

### Task 5: Deterministic local validators and Git sync script

**Files:**
- Create: `scripts/validate-skills.mjs`
- Create: `scripts/sync-skills.mjs`
- Create: `reports/.gitkeep`

- [ ] **Step 1: Implement skill validator**

Use Node filesystem APIs to scan `skills/**/SKILL.md`, parse required frontmatter fields, validate names/descriptions, detect TODO/TBD placeholders, and return non-zero on errors.

- [ ] **Step 2: Implement sync checkout and diffing**

Use Git CLI through `spawnSync`/`spawn` to clone or fetch each manifest source in a temporary directory, resolve the configured ref, compare baseline to current, list changed `skills/**` paths, map each path to local skills, and show unified diffs for mapped files.

- [ ] **Step 3: Preserve no-write default**

Only `--write-report` may create a report file. `--mark-baseline <source>` requires `--yes` and updates only that source's baseline after the user has independently absorbed changes.

- [ ] **Step 4: Test script behavior with a local fixture repository**

Create a temporary Git repository with one baseline skill, modify/add/delete files, run the sync script against it, assert the report names all three change types, and assert local `skills/` and manifest are unchanged.

- [ ] **Step 5: Commit**

```bash
git add scripts reports
 git commit -m "feat: add skill validation and upstream diff tooling"
```

### Task 6: Pi status and workflow extension

**Files:**
- Create: `extensions/skills-status.js`
- Modify: `README.md`

- [ ] **Step 1: Implement explicit commands and mode detection**

Register `/fast`, `/clarify`, `/deep`, `/design`, `/review`, `/skills`, and `/sync-skills`. Detect Chinese prefixes and inject only the short adaptive policy plus current override.

- [ ] **Step 2: Observe skill use**

Track expanded `<skill name="...">` blocks, raw `/skill:name` input, and `read` calls targeting loaded skill files. Mark `adaptive-workflow` active when the extension injects its policy.

- [ ] **Step 3: Persist and render session counts**

Append hidden custom entries at settled turns, reconstruct them on session start, set footer status to `🐂🐎 N skills`, and show current/session lists in a small widget. Return no transcript component for metadata entries.

- [ ] **Step 4: Integrate sync command without changing third-party code**

Run the package-local `scripts/sync-skills.mjs` through Pi's command execution API and display a concise result/error notification.

- [ ] **Step 5: Verify extension loading**

Run: `node --check extensions/skills-status.js`
Expected: exit 0.

Run: `pi -e ./extensions/skills-status.js --no-skills -p "Reply with OK"`
Expected: extension loads; if provider credentials are unavailable, report that separately from syntax/load success.

- [ ] **Step 6: Commit**

```bash
git add extensions README.md
git commit -m "feat: add cow-horse skill status extension"
```

### Task 7: End-to-end package verification

**Files:**
- Modify: `README.md` only if verification reveals a usage gap.

- [ ] **Step 1: Validate all skills**

Run: `node scripts/validate-skills.mjs`
Expected: six local skills pass.

- [ ] **Step 2: Validate package resource discovery**

Run: `pi -e ./extensions/skills-status.js --no-skills -p "List the available local package files without editing them"`
Expected: extension has no load error; no local package file is changed.

- [ ] **Step 3: Check clean diff and file inventory**

Run: `git diff --check` and `git status --short`
Expected: no whitespace errors; only intended files are present or the worktree is clean after commits.

- [ ] **Step 4: Commit final corrections**

```bash
git add -u
git commit -m "chore: verify personal pi skills package"
```

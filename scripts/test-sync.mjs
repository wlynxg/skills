#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, renameSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "personal-pi-sync-test-"));
const upstream = join(root, "upstream");
const work = join(root, "work");
const SYNC_ENTRY = join("scripts", "sync-skills.mjs");
const NODE_BIN = process.execPath;
const SOURCE_ID = "fixture";
const syncScript = join(process.cwd(), SYNC_ENTRY);
const REFERENCE_PATH = ".agents/skills/mapped/references/policy.md";
const RENAMED_FROM = ".agents/skills/mapped/references/legacy.md";
const RENAMED_TO = ".agents/skills/mapped/references/renamed.md";
const RENAME_BEFORE = "stable line 1\nstable line 2\nstable line 3\nold behavior\nstable line 4\nstable line 5\n";
const SENTINEL = "local skill must not be overwritten\n";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

try {
  mkdirSync(join(upstream, ".agents", "skills", "mapped"), { recursive: true });
  writeFileSync(join(upstream, ".agents", "skills", "mapped", "SKILL.md"), "---\nname: mapped\ndescription: Use when testing a mapped fixture.\n---\n\nbase\n");
  git(["init", "-q", "-b", "main"], upstream);
  git(["config", "user.email", "test@example.com"], upstream);
  git(["config", "user.name", "Fixture"], upstream);
  mkdirSync(join(upstream, ".agents", "skills", "mapped", "references"), { recursive: true });
  writeFileSync(join(upstream, REFERENCE_PATH), "reference before\n");
  writeFileSync(join(upstream, RENAMED_FROM), RENAME_BEFORE);
  git(["add", "."], upstream);
  git(["commit", "-q", "-m", "baseline"], upstream);
  const baseline = git(["rev-parse", "HEAD"], upstream);

  rmSync(join(upstream, ".agents", "skills", "mapped", "SKILL.md"));
  writeFileSync(join(upstream, REFERENCE_PATH), "reference after\n");
  renameSync(join(upstream, RENAMED_FROM), join(upstream, RENAMED_TO));
  writeFileSync(join(upstream, RENAMED_TO), RENAME_BEFORE.replace("old behavior", "new behavior"));
  mkdirSync(join(upstream, ".agents", "skills", "new-skill"), { recursive: true });
  writeFileSync(join(upstream, ".agents", "skills", "new-skill", "SKILL.md"), "---\nname: new-skill\ndescription: Use when testing a new fixture.\n---\n\nnew\n");
  git(["add", "-A"], upstream);
  git(["commit", "-q", "-m", "change"], upstream);

  mkdirSync(join(work, "sources"), { recursive: true });
  mkdirSync(join(work, "scripts"), { recursive: true });
  mkdirSync(join(work, "skills", "local"), { recursive: true });
  const protectedSkill = join(work, "skills", "local", "SKILL.md");
  const manifestPath = join(work, "sources", "manifest.json");
  writeFileSync(protectedSkill, SENTINEL);
  writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    sources: [{
      id: SOURCE_ID,
      url: upstream,
      ref: "main",
      baseline,
      mappings: [
        { upstream: ".agents/skills/mapped/SKILL.md", local: "skills/local/SKILL.md", status: "absorbed" },
        { upstream: REFERENCE_PATH, local: "skills/local/references/policy.md", status: "adapted" },
        { upstream: RENAMED_FROM, local: "skills/local/references/legacy.md", status: "adapted" },
      ],
    }],
  }, null, 2));
  execFileSync("cp", [syncScript, join(work, "scripts", "sync-skills.mjs")]);

  const manifestBefore = readFileSync(manifestPath, "utf8");
  const output = execFileSync(NODE_BIN, [SYNC_ENTRY], { cwd: work, encoding: "utf8" });
  for (const expected of ["D", ".agents/skills/mapped/SKILL.md", "A", ".agents/skills/new-skill/SKILL.md", "Unmapped candidates", REFERENCE_PATH, "reference after", RENAMED_FROM, RENAMED_TO, "-old behavior", "+new behavior"]) {
    if (!output.includes(expected)) throw new Error(`missing expected output: ${expected}`);
  }
  if (readFileSync(manifestPath, "utf8") !== manifestBefore) throw new Error("baseline changed");

  // 在隔离仓验证报告不能覆盖 skill，包含目录/文件符号链接绕过。
  const reportCases = ["skills/local/SKILL.md", "reports", "reports/linked/SKILL.md", "reports/linked-file.md"];
  mkdirSync(join(work, "reports"));
  symlinkSync(join(work, "skills", "local"), join(work, "reports", "linked"), "dir");
  symlinkSync(protectedSkill, join(work, "reports", "linked-file.md"));
  for (const reportPath of reportCases) {
    const result = spawnSync(NODE_BIN, [SYNC_ENTRY, "--write-report", "--report", reportPath], { cwd: work, encoding: "utf8" });
    if (result.error || result.status === 0) throw new Error(`unsafe report path accepted: ${reportPath}`);
    if (readFileSync(protectedSkill, "utf8") !== SENTINEL) throw new Error("local skill overwritten");
    if (readFileSync(manifestPath, "utf8") !== manifestBefore) throw new Error("report changed baseline");
  }
  execFileSync(NODE_BIN, [SYNC_ENTRY, "--write-report", "--report", "reports/nested/result.md"], { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (!readFileSync(join(work, "reports", "nested", "result.md"), "utf8").includes(REFERENCE_PATH)) throw new Error("mapped reference missing from report");
  const unapproved = spawnSync(NODE_BIN, [SYNC_ENTRY, "--source", SOURCE_ID, "--mark-baseline", SOURCE_ID], { cwd: work, encoding: "utf8" });
  if (unapproved.status !== 2 || readFileSync(manifestPath, "utf8") !== manifestBefore) throw new Error("unapproved baseline update");
  execFileSync(NODE_BIN, [SYNC_ENTRY, "--source", SOURCE_ID, "--mark-baseline", SOURCE_ID, "--yes"], { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (JSON.parse(readFileSync(manifestPath, "utf8")).sources[0].baseline !== git(["rev-parse", "HEAD"], upstream)) throw new Error("approved baseline was not advanced");
  if (readFileSync(protectedSkill, "utf8") !== SENTINEL) throw new Error("baseline update changed local skill");
  console.log("sync fixture passed (mapped references, protected paths, reports and explicit baseline approval)");
} finally {
  rmSync(root, { recursive: true, force: true });
}

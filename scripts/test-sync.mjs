#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "personal-pi-sync-test-"));
const upstream = join(root, "upstream");
const work = join(root, "work");
const syncScript = join(process.cwd(), "scripts", "sync-skills.mjs");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

try {
  mkdirSync(join(upstream, "skills", "mapped"), { recursive: true });
  writeFileSync(join(upstream, "skills", "mapped", "SKILL.md"), "---\nname: mapped\ndescription: Use when testing a mapped fixture.\n---\n\nbase\n");
  git(["init", "-q", "-b", "main"], upstream);
  git(["config", "user.email", "test@example.com"], upstream);
  git(["config", "user.name", "Fixture"], upstream);
  git(["add", "."], upstream);
  git(["commit", "-q", "-m", "baseline"], upstream);
  const baseline = git(["rev-parse", "HEAD"], upstream);

  rmSync(join(upstream, "skills", "mapped", "SKILL.md"));
  mkdirSync(join(upstream, "skills", "new-skill"), { recursive: true });
  writeFileSync(join(upstream, "skills", "new-skill", "SKILL.md"), "---\nname: new-skill\ndescription: Use when testing a new fixture.\n---\n\nnew\n");
  git(["add", "-A"], upstream);
  git(["commit", "-q", "-m", "change"], upstream);

  mkdirSync(join(work, "sources"), { recursive: true });
  mkdirSync(join(work, "scripts"), { recursive: true });
  mkdirSync(join(work, "skills", "local"), { recursive: true });
  writeFileSync(join(work, "sources", "manifest.json"), JSON.stringify({
    version: 1,
    sources: [{
      id: "fixture",
      url: upstream,
      ref: "main",
      baseline,
      mappings: [{ upstream: "skills/mapped/SKILL.md", local: "skills/local/SKILL.md", status: "absorbed" }],
    }],
  }, null, 2));
  execFileSync("cp", [syncScript, join(work, "scripts", "sync-skills.mjs")]);

  const output = execFileSync("node", ["scripts/sync-skills.mjs"], { cwd: work, encoding: "utf8" });
  for (const expected of ["D", "skills/mapped/SKILL.md", "A", "skills/new-skill/SKILL.md", "Unmapped candidates"]) {
    if (!output.includes(expected)) throw new Error(`missing expected output: ${expected}`);
  }
  if (!readFileSync(join(work, "sources", "manifest.json"), "utf8").includes(baseline)) throw new Error("baseline changed");
  console.log("sync fixture passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}

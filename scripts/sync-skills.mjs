#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const manifestPath = join(process.cwd(), "sources", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const args = process.argv.slice(2);
const sourceFilter = valueAfter("--source");
const markBaselineId = valueAfter("--mark-baseline");
const writeReport = args.includes("--write-report");
const reportPath = valueAfter("--report") || join("reports", `sync-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
const confirmed = args.includes("--yes");

if (args.includes("--help")) {
  console.log(`Usage: node scripts/sync-skills.mjs [options]\n\nOptions:\n  --source <id>             inspect one manifest source\n  --write-report            also write the Markdown report\n  --report <path>          report path with --write-report\n  --mark-baseline <id>     advance one source baseline\n  --yes                    confirm baseline update\n`);
  process.exit(0);
}

if (markBaselineId && !confirmed) {
  console.error("Refusing to change a baseline without --yes.");
  process.exit(2);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function git(cwd, gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    const detail = stderr || error.message;
    throw new Error(`git ${gitArgs.join(" ")} failed: ${detail}`);
  }
}

function parseNameStatus(raw) {
  const fields = raw.split("\0").filter(Boolean);
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    const code = status[0];
    if (code === "R" || code === "C") {
      changes.push({ status, oldPath: fields[index++], path: fields[index++] });
    } else {
      changes.push({ status, path: fields[index++] });
    }
  }
  return changes;
}

function listSkillFiles(repo, commit) {
  const output = git(repo, ["ls-tree", "-r", "--name-only", commit, "--", "skills/"]);
  return output.split(/\r?\n/).filter(path => /^skills\/.+\/SKILL\.md$/.test(path));
}

function mappedFor(source, upstreamPath) {
  return source.mappings?.find(mapping => mapping.upstream === upstreamPath);
}

function limitDiff(text, maxLines = 120) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join("\n")}\n... (${lines.length - maxLines} more diff lines omitted)`;
}

function inspectSource(source) {
  const tempRoot = mkdtempSync(join(tmpdir(), "personal-pi-skills-"));
  const repo = join(tempRoot, source.id);
  try {
    git(tempRoot, ["clone", "--quiet", "--no-tags", source.url, repo]);
    git(repo, ["fetch", "--quiet", "origin", source.ref]);
    const current = git(repo, ["rev-parse", "FETCH_HEAD^{commit}"]);
    try {
      git(repo, ["cat-file", "-e", `${source.baseline}^{commit}`]);
    } catch {
      git(repo, ["fetch", "--quiet", "origin", source.baseline]);
      git(repo, ["cat-file", "-e", `${source.baseline}^{commit}`]);
    }

    const rawChanges = git(repo, ["diff", "--name-status", "--find-renames", "-z", source.baseline, current, "--", "skills/"]);
    const changes = parseNameStatus(rawChanges);
    const mappedPaths = new Set((source.mappings ?? []).map(mapping => mapping.upstream));
    const currentSkillFiles = listSkillFiles(repo, current);
    const candidates = currentSkillFiles.filter(path => !mappedPaths.has(path));
    const mappedChanges = changes
      .map(change => ({ ...change, mapping: mappedFor(source, change.path) || mappedFor(source, change.oldPath) }))
      .filter(change => change.mapping);
    const unmappedChanges = changes.filter(change => !mappedFor(source, change.path) && !mappedFor(source, change.oldPath));

    const lines = [
      `## ${source.id}`,
      `- URL: ${source.url}`,
      `- Ref: ${source.ref}`,
      `- Baseline: ${source.baseline}`,
      `- Current: ${current}`,
      "",
      "### Changes since baseline",
    ];
    if (changes.length === 0) lines.push("- No changes under `skills/`.");
    else for (const change of changes) lines.push(`- ${change.status}: ${change.oldPath ? `${change.oldPath} -> ` : ""}${change.path}`);

    lines.push("", "### Mapped changes");
    if (mappedChanges.length === 0) lines.push("- None.");
    for (const change of mappedChanges) {
      const mapping = change.mapping;
      const diffPath = change.path || change.oldPath;
      let diff = "";
      try {
        diff = git(repo, ["diff", "--no-ext-diff", "--unified=3", source.baseline, current, "--", diffPath]);
      } catch (error) {
        diff = `Unable to read diff: ${error.message}`;
      }
      lines.push(`#### ${diffPath} -> ${mapping.local}`, "", "````diff", limitDiff(diff || "(empty diff)"), "````");
    }

    lines.push("", "### Unmapped candidates");
    if (unmappedChanges.length === 0 && candidates.length === 0) lines.push("- None.");
    for (const change of unmappedChanges) lines.push(`- changed but not mapped: ${change.path}`);
    for (const candidate of candidates.filter(path => !unmappedChanges.some(change => change.path === path))) lines.push(`- current skill without mapping: ${candidate}`);

    return { id: source.id, current, text: lines.join("\n") };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const selected = manifest.sources.filter(source => !sourceFilter || source.id === sourceFilter);
if (selected.length === 0) {
  console.error(sourceFilter ? `Unknown source: ${sourceFilter}` : "No sources in manifest.");
  process.exit(2);
}

const results = [];
let failed = false;
for (const source of selected) {
  try {
    results.push(inspectSource(source));
  } catch (error) {
    failed = true;
    results.push({ id: source.id, current: null, text: `## ${source.id}\n- ERROR: ${error.message}` });
  }
}

const report = ["# Upstream Skills Sync Report", `Generated: ${new Date().toISOString()}`, "", ...results.map(result => result.text), ""].join("\n");
console.log(report);
if (writeReport) {
  const absoluteReportPath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, report, "utf8");
  console.error(`Report written to ${relative(process.cwd(), absoluteReportPath)}`);
}

if (markBaselineId) {
  const result = results.find(item => item.id === markBaselineId);
  if (!result?.current) {
    console.error(`Cannot advance baseline for ${markBaselineId}: source inspection failed or was not selected.`);
    process.exit(1);
  }
  const source = manifest.sources.find(item => item.id === markBaselineId);
  source.baseline = result.current;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.error(`Baseline advanced for ${markBaselineId}: ${result.current}`);
}

if (failed) process.exit(1);

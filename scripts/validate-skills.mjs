#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "skills");
const errors = [];
const names = new Map();
const files = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === "SKILL.md") files.push(path);
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function hasRealPlaceholder(text) {
  return /\b(?:TODO|TBD|FIXME)\s*:/i.test(text) ||
    /^\s*(?:TODO|TBD|FIXME)\s*$/im.test(text) ||
    /\[\s*(?:TODO|TBD|FIXME)\s*\]/i.test(text);
}

walk(root);
if (files.length === 0) errors.push("no skills/**/SKILL.md files found");

for (const file of files) {
  const rel = relative(process.cwd(), file);
  const text = readFileSync(file, "utf8");
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    errors.push(`${rel}: missing YAML frontmatter`);
    continue;
  }

  const { name, description } = frontmatter;
  if (!name) errors.push(`${rel}: missing name`);
  else {
    if (name.length > 64) errors.push(`${rel}: name exceeds 64 characters`);
    if (!/^[a-z0-9-]+$/.test(name)) errors.push(`${rel}: invalid name '${name}'`);
    if (names.has(name)) errors.push(`${rel}: duplicate name, also used by ${names.get(name)}`);
    names.set(name, rel);
  }
  if (!description) errors.push(`${rel}: missing description`);
  else {
    if (description.length > 1024) errors.push(`${rel}: description exceeds 1024 characters`);
    if (!description.startsWith("Use when")) errors.push(`${rel}: description must start with 'Use when'`);
  }
  if (hasRealPlaceholder(text)) errors.push(`${rel}: unfinished TODO/TBD/FIXME placeholder`);
}

if (errors.length > 0) {
  console.error("Skill validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Skill validation passed: ${files.length} skills (${[...names.keys()].join(", ")})`);

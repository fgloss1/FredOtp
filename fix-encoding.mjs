import fs from "fs";
import os from "os";
import path from "path";

const root = process.cwd();

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const SKIP_FILES = new Set(["fix-encoding.mjs"]);

const EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css",
  ".scss", ".sass", ".html", ".md", ".mdx", ".prisma", ".sql",
]);

const CP1252_SPECIAL = new Map([
  ["€", 0x80], ["‚", 0x82], ["ƒ", 0x83], ["„", 0x84], ["…", 0x85],
  ["†", 0x86], ["‡", 0x87], ["ˆ", 0x88], ["‰", 0x89], ["Š", 0x8A],
  ["‹", 0x8B], ["Œ", 0x8C], ["Ž", 0x8E], ["‘", 0x91], ["’", 0x92],
  ["“", 0x93], ["”", 0x94], ["•", 0x95], ["–", 0x96], ["—", 0x97],
  ["˜", 0x98], ["™", 0x99], ["š", 0x9A], ["›", 0x9B], ["œ", 0x9C],
  ["ž", 0x9E], ["Ÿ", 0x9F],
]);

function isCandidateFile(filePath) {
  return EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    if (entry.isDirectory() && entry.name.startsWith(".encoding-backup-")) continue;
    if (entry.isFile() && SKIP_FILES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(fullPath));
    else if (isCandidateFile(fullPath)) results.push(fullPath);
  }
  return results;
}

function mojibakeScore(text) {
  const markers = ["Ã", "Â", "â", "ð", "ï¿½", "¤", "€™", "œ", "š", "ž"];
  let score = 0;
  for (const marker of markers) {
    let pos = 0;
    while ((pos = text.indexOf(marker, pos)) !== -1) {
      score++;
      pos += marker.length;
    }
  }
  return score;
}

function encodeWindows1252PreservingUnicode(text) {
  const placeholders = [];
  const output = [];
  let placeholderId = 0;

  for (const char of text) {
    const code = char.codePointAt(0);
    if (code <= 0xff) {
      output.push(code);
      continue;
    }
    if (CP1252_SPECIAL.has(char)) {
      output.push(CP1252_SPECIAL.get(char));
      continue;
    }
    const token = `\u0001U${placeholderId}\u0002`;
    placeholders.push({ token, char });
    for (const tokenChar of token) output.push(tokenChar.charCodeAt(0));
    placeholderId++;
  }
  return { bytes: Uint8Array.from(output), placeholders };
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function restorePlaceholders(text, placeholders) {
  let result = text;
  for (const { token, char } of placeholders) result = result.split(token).join(char);
  return result;
}

function repairOnce(text) {
  const before = mojibakeScore(text);
  if (before === 0) return null;
  const encoded = encodeWindows1252PreservingUnicode(text);
  const decoded = decodeUtf8(encoded.bytes);
  if (decoded === null) return null;
  const restored = restorePlaceholders(decoded, encoded.placeholders);
  const after = mojibakeScore(restored);
  if (after >= before) return null;
  return { text: restored, before, after };
}

function repair(text) {
  let current = text;
  let changes = 0;
  for (let pass = 0; pass < 5; pass++) {
    const result = repairOnce(current);
    if (!result) break;
    current = result.text;
    changes++;
    if (result.after === 0) break;
  }
  return { text: current, changes };
}

const files = walk(root);
const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fredotp-encoding-backup-"));
let affectedFiles = 0;
let totalChanges = 0;

console.log("\n====================================================");
console.log(" NAVA - DEFINITIVE UTF-8 MOJIBAKE REPAIR");
console.log("====================================================\n");

for (const filePath of files) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  const score = mojibakeScore(content);
  if (score === 0) continue;
  const repaired = repair(content);
  if (repaired.text === content) {
    console.log(`  ⚠️  FOUND BUT NOT CHANGED: ${path.relative(root, filePath)}`);
    continue;
  }
  const relative = path.relative(root, filePath);
  const backupPath = path.join(backupRoot, relative);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  fs.writeFileSync(filePath, repaired.text, "utf8");
  affectedFiles++;
  totalChanges += repaired.changes;
  console.log(`  ✅  ${relative}  (${score} suspicious markers repaired)`);
}

console.log("\n----------------------------------------------------");
console.log(`Files repaired : ${affectedFiles}`);
console.log(`Repair passes  : ${totalChanges}`);
console.log(`Temp backup    : ${backupRoot}`);
console.log("----------------------------------------------------\n");

const remaining = [];
for (const filePath of files) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  if (mojibakeScore(content) > 0) remaining.push(path.relative(root, filePath));
}

if (remaining.length > 0) {
  console.log("⚠️  Possible mojibake remains in:");
  for (const file of remaining) console.log(`    ${file}`);
  console.log("");
} else {
  console.log("✅ No detected mojibake remains in scanned source.\n");
}

console.log("Repair script completed.\n");

/**
 * LED Wall Calculator — Smoke Test (Node.js)
 * Runs basic validation checks after code changes.
 * Usage: node tests/smoke-test.js
 *
 * This is a 1:1 port of tests/smoke-test.py for machines without Python3.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INDEX_HTML = path.join(PROJECT_ROOT, "index.html");
const VERSION_JSON = path.join(PROJECT_ROOT, "version.json");
const SW_JS = path.join(PROJECT_ROOT, "sw.js");

const JS_MODULE_DIRS = [
  "core", "specs", "layouts", "structure", "interact",
  "nav", "export", "config", "screens"
];

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg) { passed++; console.log("  PASS  " + msg); }
function fail(msg) { failed++; console.log("  FAIL  " + msg); }
function warn(msg) { warnings++; console.log("  WARN  " + msg); }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllJsFiles() {
  const files = [];
  // Include sw.js from project root
  if (fs.existsSync(SW_JS)) {
    files.push(SW_JS);
  }
  for (const d of JS_MODULE_DIRS) {
    const dirPath = path.join(PROJECT_ROOT, d);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const entries = fs.readdirSync(dirPath).filter(f => f.endsWith(".js")).sort();
      for (const fname of entries) {
        files.push(path.join(dirPath, fname));
      }
    }
  }
  return files;
}

function readAllJsContent() {
  let content = "";
  if (fs.existsSync(INDEX_HTML)) {
    content = fs.readFileSync(INDEX_HTML, "utf8");
  }
  for (const jsFile of getAllJsFiles()) {
    content += "\n" + fs.readFileSync(jsFile, "utf8");
  }
  return content;
}

// ---------------------------------------------------------------------------
// 1. version.json validation
// ---------------------------------------------------------------------------
function checkVersionJson() {
  console.log("\n--- version.json ---");

  if (!fs.existsSync(VERSION_JSON)) {
    fail("version.json not found");
    return null;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(VERSION_JSON, "utf8"));
  } catch (e) {
    fail("version.json is not valid JSON: " + e.message);
    return null;
  }
  ok("version.json is valid JSON");

  const version = data.version;
  if (!version) {
    fail("version.json missing 'version' field");
    return null;
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail("version.json version '" + version + "' doesn't match X.X.X format");
  } else {
    ok("version.json version format valid: " + version);
  }

  const updated = data.updated;
  if (!updated) {
    fail("version.json missing 'updated' field");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    fail("version.json updated '" + updated + "' doesn't match YYYY-MM-DD format");
  } else {
    ok("version.json updated date valid: " + updated);
  }

  return version;
}

// ---------------------------------------------------------------------------
// 2. APP_VERSION in index.html matches version.json
// ---------------------------------------------------------------------------
function checkAppVersionSync(expectedVersion) {
  console.log("\n--- APP_VERSION sync ---");

  if (!fs.existsSync(INDEX_HTML)) {
    fail("index.html not found");
    return;
  }

  const content = fs.readFileSync(INDEX_HTML, "utf8");
  const match = content.match(/const APP_VERSION\s*=\s*'([^']+)'/);
  if (!match) {
    fail("Could not find APP_VERSION in index.html");
    return;
  }

  const appVersion = match[1];
  if (expectedVersion && appVersion !== expectedVersion) {
    fail("APP_VERSION '" + appVersion + "' != version.json '" + expectedVersion + "'");
  } else if (expectedVersion) {
    ok("APP_VERSION matches version.json: " + appVersion);
  } else {
    warn("APP_VERSION found (" + appVersion + ") but couldn't verify against version.json");
  }
}

// ---------------------------------------------------------------------------
// 2b. SW_VERSION in sw.js matches version.json
// ---------------------------------------------------------------------------
function checkSwVersionSync(expectedVersion) {
  console.log("\n--- SW_VERSION sync ---");

  if (!fs.existsSync(SW_JS)) {
    fail("sw.js not found");
    return;
  }

  const content = fs.readFileSync(SW_JS, "utf8");
  const match = content.match(/const SW_VERSION\s*=\s*'([^']+)'/);
  if (!match) {
    fail("Could not find SW_VERSION in sw.js");
    return;
  }

  const swVersion = match[1];
  if (expectedVersion && swVersion !== expectedVersion) {
    fail("SW_VERSION '" + swVersion + "' != version.json '" + expectedVersion + "'");
  } else if (expectedVersion) {
    ok("SW_VERSION matches version.json: " + swVersion);
  } else {
    warn("SW_VERSION found (" + swVersion + ") but couldn't verify against version.json");
  }
}

// ---------------------------------------------------------------------------
// 3. HTML structure validation
// ---------------------------------------------------------------------------
function checkHtmlStructure() {
  console.log("\n--- HTML structure ---");

  if (!fs.existsSync(INDEX_HTML)) {
    fail("index.html not found");
    return;
  }

  const content = fs.readFileSync(INDEX_HTML, "utf8");

  // DOCTYPE
  if (content.trimStart().startsWith("<!DOCTYPE html>")) {
    ok("DOCTYPE present");
  } else {
    fail("Missing <!DOCTYPE html>");
  }

  // Essential tags
  for (const tag of ["<html", "</html>", "<head>", "</head>", "<body", "</body>"]) {
    if (content.includes(tag)) {
      ok("Found " + tag);
    } else {
      fail("Missing " + tag);
    }
  }

  // Balanced style tags
  const styleOpens = (content.match(/<style/g) || []).length;
  const styleCloses = (content.match(/<\/style>/g) || []).length;
  if (styleOpens === styleCloses) {
    ok("Style tags balanced (" + styleOpens + " open, " + styleCloses + " close)");
  } else {
    fail("Style tags unbalanced (" + styleOpens + " open, " + styleCloses + " close)");
  }

  // Balanced script tags
  const scriptOpens = (content.match(/<script[\s>]/g) || []).length;
  const scriptCloses = (content.match(/<\/script>/g) || []).length;
  if (scriptOpens === scriptCloses) {
    ok("Script tags balanced (" + scriptOpens + " open, " + scriptCloses + " close)");
  } else {
    fail("Script tags unbalanced (" + scriptOpens + " open, " + scriptCloses + " close)");
  }
}

// ---------------------------------------------------------------------------
// 4. JS section headers check
// ---------------------------------------------------------------------------
function checkSectionHeaders() {
  console.log("\n--- JS section headers ---");

  if (!fs.existsSync(INDEX_HTML)) {
    fail("index.html not found");
    return;
  }

  const lines = fs.readFileSync(INDEX_HTML, "utf8").split("\n");
  const headerPattern = /\/\/\s*={10,}.*={10,}/;
  let headersFound = 0;

  for (const line of lines) {
    if (headerPattern.test(line)) headersFound++;
  }

  if (headersFound > 0) {
    ok("Found " + headersFound + " JS section headers");
  } else {
    warn("No section headers found — expected // ==================== patterns");
  }
}

// ---------------------------------------------------------------------------
// 5. localStorage key consistency
// ---------------------------------------------------------------------------
function checkLocalStorageKeys() {
  console.log("\n--- localStorage keys ---");

  const content = readAllJsContent();

  const getKeys = new Set((content.match(/localStorage\.getItem\(['"]([^'"]+)['"]\)/g) || [])
    .map(m => m.match(/['"]([^'"]+)['"]/)[1]));
  const setKeys = new Set((content.match(/localStorage\.setItem\(['"]([^'"]+)['"]\)/g) || [])
    .map(m => m.match(/['"]([^'"]+)['"]/)[1]));
  const removeKeys = new Set((content.match(/localStorage\.removeItem\(['"]([^'"]+)['"]\)/g) || [])
    .map(m => m.match(/['"]([^'"]+)['"]/)[1]));

  // Keys read but never written
  const readOnly = [...getKeys].filter(k => !setKeys.has(k) && !removeKeys.has(k));
  if (readOnly.length > 0) {
    for (const key of readOnly) {
      warn("localStorage key '" + key + "' is read but never written");
    }
  } else {
    ok("All read localStorage keys have matching writes");
  }

  // Keys written but never read
  const writeOnly = [...setKeys].filter(k => !getKeys.has(k));
  if (writeOnly.length > 0) {
    for (const key of writeOnly) {
      warn("localStorage key '" + key + "' is written but never read");
    }
  } else {
    ok("All written localStorage keys have matching reads");
  }

  const allKeys = new Set([...getKeys, ...setKeys]);
  ok("Found " + allKeys.size + " unique localStorage keys");
}

// ---------------------------------------------------------------------------
// 6. Basic JS syntax checks (bracket balance)
// ---------------------------------------------------------------------------
function checkJsSyntax() {
  console.log("\n--- JS basic syntax ---");

  if (!fs.existsSync(INDEX_HTML)) {
    fail("index.html not found");
    return;
  }

  const content = fs.readFileSync(INDEX_HTML, "utf8");

  // Extract inline JS blocks
  const jsBlocks = [];
  const blockRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = blockRegex.exec(content)) !== null) {
    // Skip external script tags (those with src=)
    const tagOpen = m[0].substring(0, m[0].indexOf(">"));
    if (tagOpen.includes("src=")) continue;
    jsBlocks.push(m[1]);
  }

  // Combine all inline JS + all extracted .js files
  let allJs = jsBlocks.join("\n");
  for (const jsFile of getAllJsFiles()) {
    allJs += "\n" + fs.readFileSync(jsFile, "utf8");
  }

  // Global bracket balance
  function countChar(str, ch) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === ch) count++;
    }
    return count;
  }

  const curlyOpen = countChar(allJs, "{");
  const curlyClose = countChar(allJs, "}");
  const curlyDiff = curlyOpen - curlyClose;
  if (Math.abs(curlyDiff) <= 2) {
    ok("Curly braces roughly balanced ({=" + curlyOpen + ", }=" + curlyClose + ", diff=" + curlyDiff + ")");
  } else {
    fail("Curly braces imbalanced ({=" + curlyOpen + ", }=" + curlyClose + ", diff=" + curlyDiff + ")");
  }

  const parenOpen = countChar(allJs, "(");
  const parenClose = countChar(allJs, ")");
  const parenDiff = parenOpen - parenClose;
  if (Math.abs(parenDiff) <= 2) {
    ok("Parentheses roughly balanced ((=" + parenOpen + ", )=" + parenClose + ", diff=" + parenDiff + ")");
  } else {
    fail("Parentheses imbalanced ((=" + parenOpen + ", )=" + parenClose + ", diff=" + parenDiff + ")");
  }

  const bracketOpen = countChar(allJs, "[");
  const bracketClose = countChar(allJs, "]");
  const bracketDiff = bracketOpen - bracketClose;
  if (Math.abs(bracketDiff) <= 2) {
    ok("Square brackets roughly balanced ([=" + bracketOpen + ", ]=" + bracketClose + ", diff=" + bracketDiff + ")");
  } else {
    fail("Square brackets imbalanced ([=" + bracketOpen + ", ]=" + bracketClose + ", diff=" + bracketDiff + ")");
  }

  // Per-file balance check
  const jsFiles = getAllJsFiles();
  const badFiles = [];
  for (const jsFile of jsFiles) {
    const fc = fs.readFileSync(jsFile, "utf8");
    if (Math.abs(countChar(fc, "{") - countChar(fc, "}")) > 1 ||
        Math.abs(countChar(fc, "(") - countChar(fc, ")")) > 1 ||
        Math.abs(countChar(fc, "[") - countChar(fc, "]")) > 1) {
      badFiles.push(path.relative(PROJECT_ROOT, jsFile));
    }
  }
  if (badFiles.length > 0) {
    for (const bf of badFiles) {
      fail("Bracket imbalance in " + bf);
    }
  } else if (jsFiles.length > 0) {
    ok("All " + jsFiles.length + " extracted JS modules have balanced brackets");
  }
}

// ---------------------------------------------------------------------------
// 7. JS parse validation via Node.js new Function()
// ---------------------------------------------------------------------------
function checkJsParse() {
  console.log("\n--- JS parse validation (Node.js) ---");

  if (!fs.existsSync(INDEX_HTML)) {
    fail("index.html not found");
    return;
  }

  const content = fs.readFileSync(INDEX_HTML, "utf8");

  // Extract inline script blocks (skip src= external scripts)
  const blocks = [];
  const blockRegex = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = blockRegex.exec(content)) !== null) {
    if (m[1].includes("src=")) continue;
    blocks.push(m[2]);
  }

  // Validate each inline block
  let inlineOk = true;
  for (let i = 0; i < blocks.length; i++) {
    try {
      new Function(blocks[i]);
    } catch (e) {
      fail("Inline script block " + i + ": " + e.message);
      inlineOk = false;
    }
  }
  if (inlineOk && blocks.length > 0) {
    ok("All " + blocks.length + " inline script blocks parse successfully");
  }

  // Validate each extracted .js module
  const jsFiles = getAllJsFiles();
  const bad = [];
  for (const jsFile of jsFiles) {
    const rel = path.relative(PROJECT_ROOT, jsFile);
    try {
      const src = fs.readFileSync(jsFile, "utf8");
      new Function(src);
    } catch (e) {
      fail(rel + ": " + e.message);
      bad.push(rel);
    }
  }
  if (bad.length === 0 && jsFiles.length > 0) {
    ok("All " + jsFiles.length + " extracted JS modules parse successfully");
  }
}

// ---------------------------------------------------------------------------
// 8. Dangerous patterns check
// ---------------------------------------------------------------------------
function checkDangerousPatterns() {
  console.log("\n--- Dangerous patterns ---");

  const dangerous = [
    { pattern: /\beval\s*\(/, desc: "eval() usage" },
    { pattern: /\bnew\s+Function\s*\(/, desc: "Function() constructor" },
    { pattern: /\bdocument\.write\s*\(/, desc: "document.write()" }
  ];

  const filesToScan = [INDEX_HTML, ...getAllJsFiles()];
  let foundAny = false;

  for (const filepath of filesToScan) {
    if (!fs.existsSync(filepath)) continue;
    const relPath = path.relative(PROJECT_ROOT, filepath);
    const lines = fs.readFileSync(filepath, "utf8").split("\n");

    for (let i = 0; i < lines.length; i++) {
      const stripped = lines[i].trim();
      // Skip comments
      if (stripped.startsWith("//") || stripped.startsWith("*")) continue;

      for (const { pattern, desc } of dangerous) {
        if (pattern.test(lines[i])) {
          warn(relPath + ":" + (i + 1) + ": " + desc + " — " + stripped.substring(0, 80));
          foundAny = true;
        }
      }
    }
  }

  if (!foundAny) {
    ok("No eval(), Function(), or document.write() found");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log("=".repeat(60));
console.log("LED Wall Calculator — Smoke Test (Node.js)");
console.log("=".repeat(60));

const version = checkVersionJson();
checkAppVersionSync(version);
checkSwVersionSync(version);
checkHtmlStructure();
checkSectionHeaders();
checkLocalStorageKeys();
checkJsSyntax();
checkJsParse();
checkDangerousPatterns();

console.log("\n" + "=".repeat(60));
console.log("Results: " + passed + " passed, " + failed + " failed, " + warnings + " warnings");
console.log("=".repeat(60));

process.exit(failed > 0 ? 1 : 0);

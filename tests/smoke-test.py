#!/usr/bin/env python3
"""
LED Wall Calculator — Smoke Test
Runs basic validation checks after code changes.
Usage: python3 tests/smoke-test.py
"""

import json
import os
import re
import sys
from html.parser import HTMLParser

# Paths relative to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
VERSION_JSON = os.path.join(PROJECT_ROOT, "version.json")

# External JS module directories to scan
JS_MODULE_DIRS = ["core", "specs", "layouts", "structure", "interact", "nav", "export", "config", "screens"]


def get_all_js_files():
    """Return list of all extracted .js module files."""
    js_files = []
    for d in JS_MODULE_DIRS:
        dir_path = os.path.join(PROJECT_ROOT, d)
        if os.path.isdir(dir_path):
            for fname in sorted(os.listdir(dir_path)):
                if fname.endswith(".js"):
                    js_files.append(os.path.join(dir_path, fname))
    return js_files


def read_all_js_content():
    """Read JS from index.html inline scripts + all extracted .js files."""
    content = ""
    if os.path.exists(INDEX_HTML):
        with open(INDEX_HTML, "r") as f:
            content = f.read()
    for js_file in get_all_js_files():
        with open(js_file, "r") as f:
            content += "\n" + f.read()
    return content

passed = 0
failed = 0
warnings = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  PASS  {msg}")


def fail(msg):
    global failed
    failed += 1
    print(f"  FAIL  {msg}")


def warn(msg):
    global warnings
    warnings += 1
    print(f"  WARN  {msg}")


# ---------------------------------------------------------------------------
# 1. version.json validation
# ---------------------------------------------------------------------------
def check_version_json():
    print("\n--- version.json ---")

    if not os.path.exists(VERSION_JSON):
        fail("version.json not found")
        return None

    try:
        with open(VERSION_JSON, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        fail(f"version.json is not valid JSON: {e}")
        return None

    ok("version.json is valid JSON")

    version = data.get("version")
    if not version:
        fail("version.json missing 'version' field")
        return None

    if not re.match(r"^\d+\.\d+\.\d+$", version):
        fail(f"version.json version '{version}' doesn't match X.X.X format")
    else:
        ok(f"version.json version format valid: {version}")

    updated = data.get("updated")
    if not updated:
        fail("version.json missing 'updated' field")
    elif not re.match(r"^\d{4}-\d{2}-\d{2}$", updated):
        fail(f"version.json updated '{updated}' doesn't match YYYY-MM-DD format")
    else:
        ok(f"version.json updated date valid: {updated}")

    return version


# ---------------------------------------------------------------------------
# 2. APP_VERSION in index.html matches version.json
# ---------------------------------------------------------------------------
def check_app_version_sync(expected_version):
    print("\n--- APP_VERSION sync ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    with open(INDEX_HTML, "r") as f:
        content = f.read()

    match = re.search(r"const APP_VERSION\s*=\s*'([^']+)'", content)
    if not match:
        fail("Could not find APP_VERSION in index.html")
        return

    app_version = match.group(1)

    if expected_version and app_version != expected_version:
        fail(f"APP_VERSION '{app_version}' != version.json '{expected_version}'")
    elif expected_version:
        ok(f"APP_VERSION matches version.json: {app_version}")
    else:
        warn(f"APP_VERSION found ({app_version}) but couldn't verify against version.json")


# ---------------------------------------------------------------------------
# 3. HTML structure validation
# ---------------------------------------------------------------------------
def check_html_structure():
    print("\n--- HTML structure ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    with open(INDEX_HTML, "r") as f:
        content = f.read()

    # Check DOCTYPE
    if content.strip().startswith("<!DOCTYPE html>"):
        ok("DOCTYPE present")
    else:
        fail("Missing <!DOCTYPE html>")

    # Check essential tags exist
    for tag in ["<html", "</html>", "<head>", "</head>", "<body", "</body>"]:
        if tag in content:
            ok(f"Found {tag}")
        else:
            fail(f"Missing {tag}")

    # Check script and style tags are balanced
    style_opens = content.count("<style")
    style_closes = content.count("</style>")
    if style_opens == style_closes:
        ok(f"Style tags balanced ({style_opens} open, {style_closes} close)")
    else:
        fail(f"Style tags unbalanced ({style_opens} open, {style_closes} close)")

    script_opens = len(re.findall(r"<script[\s>]", content))
    script_closes = content.count("</script>")
    if script_opens == script_closes:
        ok(f"Script tags balanced ({script_opens} open, {script_closes} close)")
    else:
        fail(f"Script tags unbalanced ({script_opens} open, {script_closes} close)")


# ---------------------------------------------------------------------------
# 4. JS section headers check
# ---------------------------------------------------------------------------
def check_section_headers():
    print("\n--- JS section headers ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    with open(INDEX_HTML, "r") as f:
        lines = f.readlines()

    header_pattern = re.compile(r"//\s*={10,}.*={10,}")
    headers_found = []

    for i, line in enumerate(lines, 1):
        if header_pattern.search(line):
            header_text = line.strip()
            headers_found.append((i, header_text))

    if headers_found:
        ok(f"Found {len(headers_found)} JS section headers")
    else:
        warn("No section headers found — expected // ==================== patterns")


# ---------------------------------------------------------------------------
# 5. localStorage key consistency
# ---------------------------------------------------------------------------
def check_localstorage_keys():
    print("\n--- localStorage keys ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    content = read_all_js_content()

    # Find all localStorage key references across all files
    get_keys = set(re.findall(r"localStorage\.getItem\(['\"]([^'\"]+)['\"]\)", content))
    set_keys = set(re.findall(r"localStorage\.setItem\(['\"]([^'\"]+)['\"]\)", content))
    remove_keys = set(re.findall(r"localStorage\.removeItem\(['\"]([^'\"]+)['\"]\)", content))

    # Also find keys used via constants
    const_keys = set(re.findall(r"STORAGE_KEY_\w+", content))

    all_read = get_keys
    all_write = set_keys

    # Keys that are read but never written
    read_only = all_read - all_write - remove_keys
    if read_only:
        for key in read_only:
            warn(f"localStorage key '{key}' is read but never written")
    else:
        ok("All read localStorage keys have matching writes")

    # Keys that are written but never read
    write_only = all_write - all_read
    if write_only:
        for key in write_only:
            warn(f"localStorage key '{key}' is written but never read")
    else:
        ok("All written localStorage keys have matching reads")

    ok(f"Found {len(all_read | all_write)} unique localStorage keys")


# ---------------------------------------------------------------------------
# 6. Basic JS syntax checks
# ---------------------------------------------------------------------------
def check_js_syntax():
    print("\n--- JS basic syntax ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    with open(INDEX_HTML, "r") as f:
        content = f.read()

    # Extract JS content from inline <script> blocks
    js_blocks = re.findall(r"<script[^>]*>(.*?)</script>", content, re.DOTALL)

    if not js_blocks:
        fail("No script blocks found")
        return

    # Combine all inline JS + all extracted .js files
    all_js = "\n".join(js_blocks)
    for js_file in get_all_js_files():
        with open(js_file, "r") as f:
            all_js += "\n" + f.read()

    # Check bracket balance (rough check — doesn't handle strings/comments perfectly)
    # This is intentionally simple — a full parser would be overkill
    opens = all_js.count("{")
    closes = all_js.count("}")
    diff = opens - closes
    if abs(diff) <= 2:  # Small tolerance for template literals
        ok(f"Curly braces roughly balanced ({{={opens}, }}={closes}, diff={diff})")
    else:
        fail(f"Curly braces imbalanced ({{={opens}, }}={closes}, diff={diff})")

    paren_opens = all_js.count("(")
    paren_closes = all_js.count(")")
    paren_diff = paren_opens - paren_closes
    if abs(paren_diff) <= 2:
        ok(f"Parentheses roughly balanced ((={paren_opens}, )={paren_closes}, diff={paren_diff})")
    else:
        fail(f"Parentheses imbalanced ((={paren_opens}, )={paren_closes}, diff={paren_diff})")

    bracket_opens = all_js.count("[")
    bracket_closes = all_js.count("]")
    bracket_diff = bracket_opens - bracket_closes
    if abs(bracket_diff) <= 2:
        ok(f"Square brackets roughly balanced ([={bracket_opens}, ]={bracket_closes}, diff={bracket_diff})")
    else:
        fail(f"Square brackets imbalanced ([={bracket_opens}, ]={bracket_closes}, diff={bracket_diff})")

    # Per-file balance check for extracted modules
    js_files = get_all_js_files()
    bad_files = []
    for js_file in js_files:
        with open(js_file, "r") as f:
            fc = f.read()
        if abs(fc.count("{") - fc.count("}")) > 1 or \
           abs(fc.count("(") - fc.count(")")) > 1 or \
           abs(fc.count("[") - fc.count("]")) > 1:
            bad_files.append(os.path.relpath(js_file, PROJECT_ROOT))
    if bad_files:
        for bf in bad_files:
            fail(f"Bracket imbalance in {bf}")
    elif js_files:
        ok(f"All {len(js_files)} extracted JS modules have balanced brackets")


# ---------------------------------------------------------------------------
# 7. Dangerous patterns check
# ---------------------------------------------------------------------------
def check_dangerous_patterns():
    print("\n--- Dangerous patterns ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    dangerous = {
        r"\beval\s*\(": "eval() usage",
        r"\bnew\s+Function\s*\(": "Function() constructor",
        r"\bdocument\.write\s*\(": "document.write()",
    }

    # Collect all files to scan: index.html + extracted .js modules
    files_to_scan = [INDEX_HTML] + get_all_js_files()

    found_any = False
    for filepath in files_to_scan:
        if not os.path.exists(filepath):
            continue
        rel_path = os.path.relpath(filepath, PROJECT_ROOT)
        with open(filepath, "r") as f:
            lines = f.readlines()
        for pattern, desc in dangerous.items():
            for i, line in enumerate(lines, 1):
                # Skip comments
                stripped = line.strip()
                if stripped.startswith("//") or stripped.startswith("*"):
                    continue
                if re.search(pattern, line):
                    warn(f"{rel_path}:{i}: {desc} — {stripped[:80]}")
                    found_any = True

    if not found_any:
        ok("No eval(), Function(), or document.write() found")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("LED Wall Calculator — Smoke Test")
    print("=" * 60)

    version = check_version_json()
    check_app_version_sync(version)
    check_html_structure()
    check_section_headers()
    check_localstorage_keys()
    check_js_syntax()
    check_dangerous_patterns()

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {warnings} warnings")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()

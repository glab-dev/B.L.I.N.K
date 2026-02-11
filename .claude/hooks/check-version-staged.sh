#!/bin/bash
# Pre-commit hook: warns if version.json is not staged before a git commit.
# This is a safety net — the /commit command handles this automatically.

# Read JSON input from stdin
INPUT=$(cat)

# Extract the command Claude is about to run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git commit commands
if [[ "$COMMAND" != git\ commit* ]]; then
  exit 0
fi

# Check if version.json is staged
if git diff --cached --name-only | grep -q "version.json"; then
  exit 0
fi

# version.json is NOT staged — warn but don't block
echo '{"systemMessage": "Warning: version.json is not staged. Did you forget to bump the version? Use /commit to handle this automatically."}'
exit 0

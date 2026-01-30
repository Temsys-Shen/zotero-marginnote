#!/bin/sh
# pack.sh - Archive all files in the current directory into <dirname> (zip format, no .zip extension)
# Excludes this script and the generated archive itself.

set -eu

script_name=$(basename "$0")
dir_name=$(basename "$PWD")
archive="$dir_name"  # final archive name (no .zip extension)
tmp_archive="${archive}.zip.tmp.$$"  # temporary zip file to avoid matching during creation

echo "Packing all files in '$(pwd)' into '${archive}' (zip format), excluding '${script_name}' and common ignore paths..."

# Ensure 'zip' is available
if ! command -v zip >/dev/null 2>&1; then
  echo "Error: 'zip' command not found. Please install zip." >&2
  exit 1
fi

# Remove any stale temporary file
[ -f "$tmp_archive" ] && rm -f "$tmp_archive"

# Create the zip archive into a temporary file, excluding this script and common build/ignore paths
# -r: recurse into directories, -q: quiet
zip -r -q "$tmp_archive" . \
  -x "$script_name" "./$script_name" \
  "$archive" "./$archive" "${archive}.zip" "./${archive}.zip" \
  "node_modules/*" ".git/*" "dist/*" "types/*" "*.zip" "package-lock.json" "pnpm-lock.yaml" 

# Move temporary archive to final name (without .zip extension)
mv "$tmp_archive" "$archive"

echo "Done: $archive"

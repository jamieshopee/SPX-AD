#!/bin/zsh
set -e

SCRIPT_DIR="${0:A:h}"

MANIFEST_PATH=$(osascript -e 'POSIX path of (choose file with prompt "Select photoshop-job-manifest.json")')
ORIGINAL_FOLDER=$(osascript -e 'POSIX path of (choose folder with prompt "Select the original asset folder")')
OUTPUT_FOLDER=$(osascript -e 'POSIX path of (choose folder with prompt "Select the processed output folder")')

osascript "$SCRIPT_DIR/run-photoshop-manifest.applescript" "$MANIFEST_PATH" "$ORIGINAL_FOLDER" "$OUTPUT_FOLDER"

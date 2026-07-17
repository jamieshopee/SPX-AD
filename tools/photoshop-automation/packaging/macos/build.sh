#!/bin/zsh

set -euo pipefail

MODE="${1:-release}"
if [[ "$MODE" != "release" && "$MODE" != "local" ]]; then
  echo "Usage: ./build.sh [release|local]" >&2
  exit 2
fi

PACKAGING_DIR="${0:A:h}"
AUTOMATION_DIR="${PACKAGING_DIR:h:h}"
PHOTOSHOP_DIR="${AUTOMATION_DIR:h}/photoshop"
VENV_DIR="$PACKAGING_DIR/.venv"
BUILD_DIR="$PACKAGING_DIR/build"
DIST_DIR="$PACKAGING_DIR/dist"
PYINSTALLER_DIST="$BUILD_DIR/pyinstaller-dist"
PYINSTALLER_WORK="$BUILD_DIR/pyinstaller-work"
APP_PATH="$PYINSTALLER_DIST/SPX Helper.app"
ICON_PATH="$BUILD_DIR/icon/SPXHelper.icns"
STAGING_ROOT="$BUILD_DIR/pkg-root"
COMPONENT_PLIST="$BUILD_DIR/component.plist"
COMPONENT_PKG="$BUILD_DIR/SPXHelper-component.pkg"
FINAL_PKG="$DIST_DIR/SPX Helper-0.5.4.pkg"
LAUNCH_AGENT_SOURCE="$PACKAGING_DIR/resources/com.spxad.helper.plist"
ENTITLEMENTS="$PACKAGING_DIR/entitlements.plist"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "macOS packaging must be built on macOS." >&2
  exit 1
fi

if [[ "$MODE" == "release" ]]; then
  : "${SPX_MACOS_APPLICATION_SIGNING_IDENTITY:?Set SPX_MACOS_APPLICATION_SIGNING_IDENTITY for release builds}"
  : "${SPX_MACOS_INSTALLER_SIGNING_IDENTITY:?Set SPX_MACOS_INSTALLER_SIGNING_IDENTITY for release builds}"
  : "${SPX_MACOS_NOTARY_PROFILE:?Set SPX_MACOS_NOTARY_PROFILE for release builds}"
fi

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"
"$VENV_PYTHON" -m pip install --upgrade pip
"$VENV_PYTHON" -m pip install -r "$PACKAGING_DIR/requirements-build.txt"

/bin/rm -rf "$BUILD_DIR" "$DIST_DIR"
/bin/mkdir -p "$BUILD_DIR" "$DIST_DIR"

"$VENV_PYTHON" "$PACKAGING_DIR/generate_icon.py" --output "$ICON_PATH"

"$VENV_PYTHON" -m PyInstaller \
  --noconfirm \
  --clean \
  --distpath "$PYINSTALLER_DIST" \
  --workpath "$PYINSTALLER_WORK" \
  "$PACKAGING_DIR/SPXHelper.spec"

if [[ ! -x "$APP_PATH/Contents/MacOS/SPX Helper" ]]; then
  echo "PyInstaller did not produce SPX Helper.app." >&2
  exit 1
fi

# Preserve the existing macOS Adapter's source-relative Photoshop tools path
# without modifying the Adapter or the shared AppleScript / JSX files.
/bin/mkdir -p "$APP_PATH/Contents/photoshop"
/bin/cp "$PHOTOSHOP_DIR/run-photoshop-manifest.applescript" \
  "$APP_PATH/Contents/photoshop/run-photoshop-manifest.applescript"
/bin/cp "$PHOTOSHOP_DIR/remove-background.jsx" \
  "$APP_PATH/Contents/photoshop/remove-background.jsx"

if [[ "$MODE" == "release" ]]; then
  /usr/bin/codesign --force --deep --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" \
    --sign "$SPX_MACOS_APPLICATION_SIGNING_IDENTITY" "$APP_PATH"
else
  /usr/bin/codesign --force --deep \
    --entitlements "$ENTITLEMENTS" \
    --sign - "$APP_PATH"
fi

/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_PATH"
"$VENV_PYTHON" "$PACKAGING_DIR/validate_config.py" --app "$APP_PATH"

/bin/mkdir -p "$STAGING_ROOT/Applications" "$STAGING_ROOT/Library/LaunchAgents"
/usr/bin/ditto "$APP_PATH" "$STAGING_ROOT/Applications/SPX Helper.app"
/bin/cp "$LAUNCH_AGENT_SOURCE" \
  "$STAGING_ROOT/Library/LaunchAgents/com.spxad.helper.plist"
/bin/chmod 0644 "$STAGING_ROOT/Library/LaunchAgents/com.spxad.helper.plist"

/usr/bin/pkgbuild --analyze \
  --root "$STAGING_ROOT" \
  "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c \
  "Set :0:RootRelativeBundlePath Applications/SPX Helper.app" \
  "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :0:BundleIsRelocatable false" "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :0:BundleHasStrictIdentifier true" "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :0:BundleIsVersionChecked true" "$COMPONENT_PLIST"
/usr/libexec/PlistBuddy -c "Set :0:BundleOverwriteAction upgrade" "$COMPONENT_PLIST"
/usr/bin/plutil -lint "$COMPONENT_PLIST"

"$VENV_PYTHON" "$PACKAGING_DIR/validate_config.py" \
  --app "$APP_PATH" \
  --component-plist "$COMPONENT_PLIST"

/usr/bin/pkgbuild \
  --root "$STAGING_ROOT" \
  --component-plist "$COMPONENT_PLIST" \
  --scripts "$PACKAGING_DIR/scripts" \
  --identifier "com.spxad.helper.pkg" \
  --version "0.5.4" \
  --install-location "/" \
  "$COMPONENT_PKG"

if [[ "$MODE" == "release" ]]; then
  /usr/bin/productbuild \
    --package "$COMPONENT_PKG" \
    --sign "$SPX_MACOS_INSTALLER_SIGNING_IDENTITY" \
    "$FINAL_PKG"
  /usr/bin/xcrun notarytool submit "$FINAL_PKG" \
    --keychain-profile "$SPX_MACOS_NOTARY_PROFILE" \
    --wait
  /usr/bin/xcrun stapler staple "$FINAL_PKG"
  /usr/bin/xcrun stapler validate "$FINAL_PKG"
  /usr/sbin/spctl --assess --type install --verbose=2 "$FINAL_PKG"
else
  /usr/bin/productbuild --package "$COMPONENT_PKG" "$FINAL_PKG"
fi

"$VENV_PYTHON" "$PACKAGING_DIR/validate_config.py" \
  --app "$APP_PATH" \
  --component-plist "$COMPONENT_PLIST" \
  --pkg "$FINAL_PKG"

echo ""
echo "SPX Helper macOS packaging build completed ($MODE)."
echo "App: $APP_PATH"
echo "PKG: $FINAL_PKG"
if [[ "$MODE" == "local" ]]; then
  echo "LOCAL ONLY - Developer ID signing and notarization were not performed."
fi

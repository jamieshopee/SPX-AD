#!/bin/zsh

set -euo pipefail

MODE="${1:-validate}"
APP_PATH="/Applications/SPX Helper.app"
EXECUTABLE="$APP_PATH/Contents/MacOS/SPX Helper"
LAUNCH_AGENT="/Library/LaunchAgents/com.spxad.helper.plist"
SNAPSHOT_DIR="${0:A:h}/build/validation"
SNAPSHOT_PATH="$SNAPSHOT_DIR/restart-before.pid"
HELPER_PID=""

pass() {
  echo "PASS - $1"
}

fail() {
  echo "FAIL - $1" >&2
  exit 1
}

helper_pids() {
  /usr/bin/pgrep -f -x "$EXECUTABLE" || true
}

listener_pids() {
  /usr/sbin/lsof -nP -a -iTCP@127.0.0.1:8901 -sTCP:LISTEN -t 2>/dev/null | /usr/bin/sort -u || true
}

assert_single_helper() {
  local processes listeners
  processes="$(helper_pids)"
  listeners="$(listener_pids)"
  [[ "$(echo "$processes" | sed '/^$/d' | wc -l | tr -d ' ')" == "1" ]] || fail "Exactly one installed SPX Helper process is running"
  pass "Exactly one installed SPX Helper process is running"
  [[ "$(echo "$listeners" | sed '/^$/d' | wc -l | tr -d ' ')" == "1" ]] || fail "Exactly one 127.0.0.1:8901 listener exists"
  pass "Exactly one 127.0.0.1:8901 listener exists"
  [[ "$processes" == "$listeners" ]] || fail "The installed SPX Helper owns the listener"
  pass "The installed SPX Helper owns the listener"
  HELPER_PID="$processes"
}

case "$MODE" in
  validate)
    [[ -x "$EXECUTABLE" ]] || fail "Installed Product Host executable exists"
    pass "Installed Product Host executable exists"
    [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Contents/Info.plist")" == "com.spxad.helper" ]] || fail "Installed application identity is correct"
    pass "Installed application identity is correct"
    [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist")" == "0.5.4" ]] || fail "Installed application version is 0.5.4"
    pass "Installed application version is 0.5.4"
    /usr/bin/codesign --verify --deep --strict "$APP_PATH" >/dev/null 2>&1 || fail "Installed application signature is structurally valid"
    pass "Installed application signature is structurally valid"
    [[ -f "$APP_PATH/Contents/photoshop/run-photoshop-manifest.applescript" ]] || fail "Installed shared AppleScript exists"
    pass "Installed shared AppleScript exists"
    [[ -f "$APP_PATH/Contents/photoshop/remove-background.jsx" ]] || fail "Installed shared remove-background.jsx exists"
    pass "Installed shared remove-background.jsx exists"
    [[ -f "$LAUNCH_AGENT" ]] || fail "Login LaunchAgent exists"
    pass "Login LaunchAgent exists"
    [[ "$(/usr/libexec/PlistBuddy -c 'Print :Label' "$LAUNCH_AGENT")" == "com.spxad.helper" ]] || fail "Login LaunchAgent identity is correct"
    pass "Login LaunchAgent identity is correct"
    [[ "$(/usr/libexec/PlistBuddy -c 'Print :ProgramArguments:0' "$LAUNCH_AGENT")" == "$EXECUTABLE" ]] || fail "Login LaunchAgent targets the installed Product Host"
    pass "Login LaunchAgent targets the installed Product Host"
    /bin/launchctl print "gui/$(/usr/bin/id -u)/com.spxad.helper" >/dev/null 2>&1 || fail "Login LaunchAgent is registered in the current session"
    pass "Login LaunchAgent is registered in the current session"
    receipt="$(/usr/sbin/pkgutil --pkg-info com.spxad.helper.pkg 2>/dev/null)" || fail "SPX Helper package receipt exists"
    pass "SPX Helper package receipt exists"
    [[ "$receipt" == *"version: 0.5.4"* ]] || fail "SPX Helper package receipt version is 0.5.4"
    pass "SPX Helper package receipt version is 0.5.4"
    assert_single_helper
    /usr/bin/curl --fail --silent --show-error \
      -H "Origin: https://jamieshopee.github.io" \
      "http://127.0.0.1:8901/ready" >/dev/null
    pass "Installed Helper preserves the Ready HTTP boundary"
    echo ""
    echo "macOS install configuration validation: PASS"
    echo "WAITING - Menu Bar visibility requires visual validation."
    echo "WAITING - Login Startup requires sign-out/sign-in validation."
    echo "WAITING - GitHub Pages to Photoshop Happy Path requires real Photoshop validation."
    ;;
  capture-restart)
    assert_single_helper
    pid="$HELPER_PID"
    /bin/mkdir -p "$SNAPSHOT_DIR"
    echo "$pid" > "$SNAPSHOT_PATH"
    echo "Captured Restart baseline PID $pid."
    ;;
  verify-restart)
    [[ -f "$SNAPSHOT_PATH" ]] || fail "Restart baseline exists"
    pass "Restart baseline exists"
    old_pid="$(cat "$SNAPSHOT_PATH")"
    assert_single_helper
    new_pid="$HELPER_PID"
    [[ "$new_pid" != "$old_pid" ]] || fail "Restart created a new Product Host process"
    pass "Restart created a new Product Host process"
    ! /bin/kill -0 "$old_pid" 2>/dev/null || fail "Restart stopped the old Product Host process"
    pass "Restart stopped the old Product Host process"
    ;;
  verify-quit)
    [[ -z "$(helper_pids)" ]] || fail "Quit stopped the installed Product Host"
    pass "Quit stopped the installed Product Host"
    [[ -z "$(listener_pids)" ]] || fail "Quit released 127.0.0.1:8901"
    pass "Quit released 127.0.0.1:8901"
    ;;
  *)
    echo "Usage: ./validate_macos_install.sh [validate|capture-restart|verify-restart|verify-quit]" >&2
    exit 2
    ;;
esac

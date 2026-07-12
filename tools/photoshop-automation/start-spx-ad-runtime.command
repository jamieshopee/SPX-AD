#!/bin/bash
# ============================================================
# Development Tool — NOT a production / product flow.
# ============================================================
#
# This script exists ONLY for:
#   - Development
#   - Debug
#   - Runtime Validation
#   - Unit testing
#
# It is NOT the product's official way of running SPX AD Runtime, and must
# never be described or treated as one. The approved Architecture is:
#
#   SPX AD Application
#     ↓
#   SPX AD Runtime
#     ↓
#   Platform Adapter
#
# In Production, SPX AD Runtime's lifecycle is created and ended by the SPX
# AD Application itself (per Decision 32, Locked) — not by a user manually
# double-clicking this file, not by any Launcher script, and not tied to
# whether Photoshop stays open. That integration belongs to the AI Workflow
# Phase (a separate, dependent Phase) and does not exist yet.
#
# This script is NOT wired into launch/ and does not modify any existing
# launcher. Use it only to start SPX AD Runtime by hand while developing or
# validating it — never as an end-user instruction.
#
# 雙擊即可啟動（僅供開發／Debug／Runtime Validation／單元測試使用，不是正式產品流程）。
# 關閉終端機視窗或按 Ctrl+C 即停止 Runtime。

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "================================================"
echo "  SPX AD Runtime（Photoshop Automation）"
echo "  [Development Tool — 僅供開發／Debug／Runtime Validation／單元測試]"
echo "  [NOT a production flow — 正式產品流程由 SPX AD Application 建立 Runtime]"
echo "  http://127.0.0.1:8901"
echo "  關閉此視窗或按 Ctrl+C 即停止 Runtime"
echo "================================================"

python3 spx_ad_runtime.py

# Windows DoJavaScript Debug Diagnostics — Product Proposal

Version: 2026-07-15-freeze-01
Status: **Implementation Proposal Complete.** Product Proposal、Proposal Audit、Proposal Revision、Implementation Proposal 均已完成（本文件為對話中已做決定的紀錄，不引入新決定）。尚未 Coding。
性質：Debug Aid（純診斷輸出），重新開啟 Locked Completed Phase（Photoshop Automation）中 Windows Adapter 相關部分，僅新增 print，不改變任何行為。
Depends on：Photoshop Automation（Completed，Locked）、本輪之前已完成的 Windows COM Initialization Bug Fix（`tools/photoshop-automation/windows_adapter.py`，已修改，未 Commit）。

---

## 1. Status

- Product Proposal：Complete。
- Proposal Audit：Complete（發現 Goal 與 Scope 矛盾——Goal 要求判斷「JSX 是否成功載入」，但 Scope 排除 JSX Logic，兩者無法同時成立）。
- Proposal Revision：Complete（Scope 收斂為僅 Adapter Flow 純診斷輸出，明確排除 JSX；「JSX 是否成功載入」從 Goal 移除，若日後仍需要，另開新 Proposal 討論 JSX Checkpoint）。
- Proposal Freeze：**Done.**
- Implementation Proposal：**Done**（見第 5 節）。
- Coding：Not started.
- Current Active Phase per `docs/AI-HANDOFF.md`：None（Waiting for next Proposal）。本提案不佔用、也不改變該 Active Phase 狀態。

## 2. Background

Windows 實機測試已確認：Ready Check 成功、Runtime Listening 正常、Photoshop 已開啟、`POST /execute` accepted、Asset Upload 全部成功、Status Polling 正常、Runtime 進入 Running、`_connect()` 成功（無診斷 print）、`app.DoJavaScript(bootstrap)` 拋出 `DISP_E_EXCEPTION (-2147352567)`，且 `output_folder` 在 Python 端讀寫兩端已確認一致。經多輪 Read-only Investigation，已無法再單靠現有程式碼與現有輸出縮小根因範圍——`DoJavaScript()` 的例外本身沒有被完整記錄下來，無從判斷 Bootstrap 是否正確組成、是否真的送達 Photoshop。

## 3. Goals

新增兩項純診斷輸出，協助判斷 Bootstrap 字串是否組對、以及 `DoJavaScript` 例外的完整內容：

1. 呼叫 `app.DoJavaScript(bootstrap)` 之前，印出 bootstrap 內容（路徑遮蔽後）。
2. 例外發生時，完整印出 COM Exception 可取得的資訊（含 `excepinfo`）。

## 4. Non-Goals / Scope（不修改）

- Runtime Flow、COM 呼叫順序、Contract、任何函式回傳值。
- JSX Logic、Background Removal、Report Format、Photoshop Processing Logic——本次不在 `remove-background.jsx` 加任何 Checkpoint。
- 不輸出使用者名稱、AppData、Temp 或任何完整磁碟路徑。

## 5. Implementation Proposal（怎麼做）

只修改 `tools/photoshop-automation/windows_adapter.py`。

### 5.1 Bootstrap 內容輸出（DoJavaScript 呼叫前）

位置：`execute()` 內，現行第 218 行 `bootstrap = _build_bootstrap_script(...)` 之後、第 220 行 `app.DoJavaScript(bootstrap)` 之前，新增一段 print。

路徑遮蔽規則：`manifest_path` / `original_folder` / `output_folder` / `JSX_PATH` 四個值，只顯示各自路徑「最後一層」（即 `os.path.basename()`），固定格式 `<...>\<basename>`，不印其餘路徑內容。

依目前程式碼實際命名（`spx_ad_runtime.py:708-709` 固定為小寫 `original` / `processed`），預期輸出會是：

```
manifestPath: <...>\manifest.json
originalFolder: <...>\original
outputFolder: <...>\processed
JSX_PATH: <...>\remove-background.jsx
```

你先前給的範例是 `originalFolder: <...>\Original`（大寫 O）。實際資料夾名稱在程式碼中固定是小寫 `original`，本 Implementation Proposal 預設**照實際名稱原樣顯示 basename，不額外轉大小寫**。如果你要強制顯示成大寫（純顯示用，不影響實際資料夾），需要另外指示；否則 Coding 時會照小寫 `original` / `processed` 印出。

### 5.2 DoJavaScript 例外完整輸出

位置：同檔案，`execute()` 內既有 `app.DoJavaScript(bootstrap)` 的 `except Exception as error`（現行 :221-226）。

新增（不改變既有回傳值 `{"ok": False, "error": "com_automation_failed: ...", "report": None}`）：
- 印出 `type(error).__name__`。
- 印出 `getattr(error, "excepinfo", None)`——`pywintypes.com_error` 通常帶這個屬性，內容可能包含 `wCode`／`source`／`description`／`helpFile`／`helpContext`／`scode`。
- 若 `excepinfo` 不存在，印出 `getattr(error, "args", None)` 作為備援。

## 6. Locked Completed Phases 影響

只新增 print 陳述式，不改變任何函式回傳值、參數或呼叫順序，延續上一輪 COM Initialization Bug Fix 已建立的「純附加診斷」模式（先例：`_connect()` 內的診斷 print）。Photoshop Automation（Completed，Locked）與其 Ready / Execution / Status / Result Contract 不受影響。

## 7. 下一步

待你確認第 5.1 節「basename 是否要轉大寫顯示」這一點後，即可開始 Coding。

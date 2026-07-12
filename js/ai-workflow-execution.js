// AI Workflow — Execution Orchestrator
// Coding Phase 2／7 建立，Phase 2 Correction 修正：
//   Consistency Audit 發現先前版本的「Runtime Job Folder + base64-in-JSON
//   一次送出」實作偏離已 Freeze 的 Photoshop-Automation-Proposal.md（第 16
//   節 Processed Folder Contract、第 4 節 Non-Goals）。本次修正為兩段式
//   Execution Contract：
//     1. POST /execute（只送 Manifest JSON，不含素材內容）
//        -> { accepted, executionId } 或 { accepted:false, reason }
//     2. 逐一 POST /executions/{executionId}/assets/{assetId}
//        （原始 binary body，不使用 base64、不使用 multipart、不使用
//        Stream upload）-> { received, reason? }
//   Runtime 收到全部預期素材後才會觸發既有 Platform Adapter；本檔案不知道
//   Runtime 內部如何用這些內容建立隱藏 Workspace。
//
// 依據（Locked，不重新設計）：
//   docs/proposals/Photoshop-Automation-Proposal.md（Execution Contract）
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 8 節
//
// 本檔案範圍：
//   - createExecution(manifest)：呼叫 POST /execute。
//   - uploadAsset(executionId, assetId, buffer)：呼叫
//     POST /executions/{executionId}/assets/{assetId}，body 為原始
//     ArrayBuffer。
//   - uploadAssetsSequentially(executionId, assetPayloads)：依序（非平行）
//     逐一上傳，任何一個失敗就停止並回報，不繼續上傳剩餘素材、不重試。
//   - fetchResult(executionId, assetId)（Phase 3 Correction 新增）：呼叫
//     GET /executions/{executionId}/results/{assetId}，取得單一 Processed
//     PNG 的原始 binary（ArrayBuffer），不使用 base64、不把圖片內容包進
//     JSON。本函式只負責「取得內容」，不負責寫入真正的 Processed/
//     資料夾——那是 js/ai-workflow-auto-import.js 的職責。
//
// 本檔案不得：
//   - 修改 Execute／Asset Upload／Result Contract 的回應語意（accepted/
//     reason、received/reason 等既有 Reason 分類不變）。
//   - 修改 Ready／Status Contract。
//   - 知道 AppleScript、JSX、macOS Adapter、Windows Adapter、Platform
//     Adapter Interface，或 SPX AD Runtime 如何用收到的內容建立隱藏
//     Workspace——本檔案只知道這幾個 HTTP 端點與其請求／回應形狀。
//   - 寫入真正的素材資料夾/Processed/、呼叫 Matching／Auto Import——那些
//     屬於 js/ai-workflow-auto-import.js 的職責，本檔案只做傳輸。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowExecution) return;

  var BASE_URL = 'http://127.0.0.1:8901';

  function parseJsonSafe(res, fallback) {
    return res
      .json()
      .catch(function () { return fallback; })
      .then(function (data) { return data || fallback; });
  }

  // 步驟 1：只送 Manifest，不含素材內容。
  function createExecution(manifest) {
    return fetch(BASE_URL + '/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest: manifest }),
    })
      .then(function (res) {
        return parseJsonSafe(res, { accepted: false, reason: 'unreachable' }).then(function (data) {
          return { httpOk: res.ok, status: res.status, data: data };
        });
      })
      .catch(function () {
        // Runtime 無法連線——與 Ready Check Controller 一致，視為 Rejected，
        // 不進入 Processing Mode。
        return { httpOk: false, status: 0, data: { accepted: false, reason: 'unreachable' } };
      });
  }

  // 步驟 2：單一素材上傳，body 為原始 binary（ArrayBuffer），不使用
  // base64、不使用 multipart/form-data、不使用 Stream upload。
  function uploadAsset(executionId, assetId, buffer) {
    var url = BASE_URL
      + '/executions/' + encodeURIComponent(executionId)
      + '/assets/' + encodeURIComponent(assetId);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buffer,
    })
      .then(function (res) {
        return parseJsonSafe(res, { received: false, reason: 'unreachable' }).then(function (data) {
          return { httpOk: res.ok, status: res.status, data: data };
        });
      })
      .catch(function () {
        return { httpOk: false, status: 0, data: { received: false, reason: 'unreachable' } };
      });
  }

  // 依序上傳每個素材（非平行、非 multipart、非 Stream）：任何一次失敗就
  // 停止，不繼續上傳剩餘素材、不自動重試。呼叫方（Workflow State Machine）
  // 依回傳的 ok 判斷是否進入下一步。
  function uploadAssetsSequentially(executionId, assetPayloads) {
    var results = [];
    var chain = Promise.resolve();

    (assetPayloads || []).forEach(function (payload) {
      chain = chain.then(function () {
        return uploadAsset(executionId, payload.assetId, payload.buffer).then(function (result) {
          results.push(result);
          var received = !!(result && result.data && result.data.received === true);
          if (!received) {
            var stopSignal = new Error('asset_upload_failed');
            stopSignal.stopUpload = true;
            stopSignal.results = results;
            stopSignal.failedAssetId = payload.assetId;
            stopSignal.result = result;
            throw stopSignal;
          }
        });
      });
    });

    return chain
      .then(function () {
        return { ok: true, results: results };
      })
      .catch(function (err) {
        if (err && err.stopUpload) {
          return { ok: false, results: err.results, failedAssetId: err.failedAssetId, result: err.result };
        }
        throw err;
      });
  }

  // Phase 3 Correction：取回單一 Processed PNG 的原始 binary。回應本身就是
  // image/png（不是 JSON），成功時直接回傳 ArrayBuffer；失敗時讀取既有的
  // JSON 錯誤形狀（{error, executionState?, executionReason?}）。
  function fetchResult(executionId, assetId) {
    var url = BASE_URL
      + '/executions/' + encodeURIComponent(executionId)
      + '/results/' + encodeURIComponent(assetId);
    return fetch(url, { method: 'GET' })
      .then(function (res) {
        if (!res.ok) {
          return parseJsonSafe(res, { error: 'unreachable' }).then(function (data) {
            return { ok: false, status: res.status, reason: data.error || 'unknown' };
          });
        }
        return res.arrayBuffer().then(function (buffer) {
          return { ok: true, status: res.status, buffer: buffer };
        });
      })
      .catch(function () {
        return { ok: false, status: 0, reason: 'unreachable' };
      });
  }

  global.BNAIWorkflowExecution = {
    createExecution: createExecution,
    uploadAsset: uploadAsset,
    uploadAssetsSequentially: uploadAssetsSequentially,
    fetchResult: fetchResult,
  };
})(window);

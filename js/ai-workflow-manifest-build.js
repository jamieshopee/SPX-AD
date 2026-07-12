// AI Workflow — Manifest Build Orchestrator
// Coding Phase 2／7 建立，Phase 2 Correction 修正：
//   - Naming／Matching Contract（Locked）：Manifest 現在已在
//     js/asset-pipeline-manifest.js 依 originalAsset.lookupKey 去重，本檔案
//     不需要再自行去重，直接依 manifest.items（每個 item 對應唯一原始檔案）
//     逐一讀取內容即可。
//   - Runtime → Browser 傳輸缺口修正（Consistency Audit 已確認 Runtime Job
//     Folder／base64-in-JSON 為錯誤實作）：改為讀取原始 ArrayBuffer，不再
//     base64 編碼——上傳改用原始 binary request body（見
//     js/ai-workflow-execution.js），不使用 base64、multipart 或 Stream
//     upload。
//
// 依據（Locked，不重新設計）：
//   docs/proposals/AI-Workflow-Proposal.md（Product Proposal, Frozen）
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 7 節
//
// 本檔案範圍（首次流程）：
//   - 沿用既有 window.BNAssetPipelineManifest.buildPhotoshopJobManifest()
//     建立首次流程的 Manifest，不重新設計 Manifest schema。
//   - 依 Manifest 的 items[].source.filename，透過呼叫方提供的
//     lookupAssetFn（既有 assetIndex 查詢邏輯，本檔案不知道也不持有
//     assetIndex 本身）讀取每個「本次 Manifest 明確需要」的素材內容
//     （原始 ArrayBuffer），交給 Execution Orchestrator 逐一上傳——只讀取
//     本次用得到的素材，不整包上傳整個資料夾。
//
// Asset Replacement Boundary（Photoshop-Automation-Proposal.md 第 17 節，
// Locked）在本檔案的處理方式：
//   首次流程建立 assetPipelineState 時，每個素材的 status 都是全新的
//   'pending'（見 js/asset-pipeline-state.js 的 createRecord()），系統中
//   還不存在任何「已處理過、之後被使用者手動置換」的素材可言——Manual
//   Replacement 這個概念，只有在至少跑過一輪 Photoshop 處理、素材進入
//   needs_rerun 狀態之後才可能發生（對應既有 getNeedsRerunAssets()）。
//   因此對「首次流程」而言，直接呼叫既有 buildPhotoshopJobManifest() 本身
//   就已經滿足 Asset Replacement Boundary（沒有素材可以被排除，因為還沒有
//   素材符合「已處理後又被替換」的前提）。真正需要排除已手動置換素材的
//   過濾邏輯，屬於 Rerun Manifest（Phase 5／7 Rerun Loop Automation）的
//   範圍，本檔案不在此提前實作或臆測其邏輯。
//
// Coding Phase 5（本輪）：新增 buildRerunManifest()，直接沿用既有
//   window.BNAssetPipelineManifest.buildPhotoshopRerunManifest()（本身已經
//   呼叫既有 getNeedsRerunAssets() 取得 Needs Rerun Collection、已處理
//   lookupKey 去重／operations 衝突保護）——本檔案不重新設計、不重新實作
//   Rerun Manifest 的建立邏輯，只是讓 Orchestrator 可以用與
//   buildFirstRunManifest 對稱的方式呼叫到它，沿用同一套
//   collectAssetPayloads()／Execution／Status／Auto Import 資料流（Product
//   Rule 1：First Run 與 Rerun 共用同一套 Runtime 流程，不建立第二套）。
//
// 本檔案不得：
//   - 修改 Manifest schema 或既有 buildPhotoshopJobManifest /
//     buildPhotoshopRerunManifest / getNeedsRerunAssets 的實作。
//   - 知道 SPX AD Runtime、Platform Adapter 或任何平台實作細節，也不知道
//     素材內容最終如何被 Runtime 寫入隱藏 Workspace——本檔案只負責「讀取
//     內容」，傳輸／落地邏輯完全交給 js/ai-workflow-execution.js 與 SPX AD
//     Runtime 自己。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowManifestBuild) return;

  function buildFirstRunManifest(pipelineState) {
    if (!global.BNAssetPipelineManifest || !global.BNAssetPipelineManifest.buildPhotoshopJobManifest) {
      return null;
    }
    return global.BNAssetPipelineManifest.buildPhotoshopJobManifest(pipelineState);
  }

  // Phase 5：Rerun Manifest——單純轉呼叫既有 buildPhotoshopRerunManifest()
  // （內部已呼叫既有 getNeedsRerunAssets() 取得 Needs Rerun Collection），
  // 不重新設計、不重新過濾。回傳值與 buildFirstRunManifest 相同形狀
  // （{itemCount, items, sourceFolderName} 或 {error}），collectAssetPayloads
  // 可原封不動沿用。
  function buildRerunManifest(pipelineState) {
    if (!global.BNAssetPipelineManifest || !global.BNAssetPipelineManifest.buildPhotoshopRerunManifest) {
      return null;
    }
    return global.BNAssetPipelineManifest.buildPhotoshopRerunManifest(pipelineState);
  }

  // 蒐集本次 Manifest 明確需要的素材內容。Manifest 的 items 已經在
  // js/asset-pipeline-manifest.js 依 originalAsset.lookupKey 去重（一個
  // item 對應一個唯一原始檔案），本函式不需要再自行去重，只需依 items 的
  // 陣列順序逐一讀取——assetId 就是該 item 在 manifest.items 內的索引
  // （字串形式），供 Execution Orchestrator 的
  // POST /executions/{executionId}/assets/{assetId} 端點使用，避免檔名
  // 本身（可能含中文／空白等字元）出現在 URL 路徑造成編碼疑慮。
  //
  // lookupAssetFn(filename) 必須回傳既有的 FileSystemFileHandle（或
  // null／undefined，代表素材不存在）——本檔案不自行維護、也不假設任何
  // 素材索引結構，完全透過呼叫方注入。
  function collectAssetPayloads(manifest, lookupAssetFn) {
    if (!manifest || !Array.isArray(manifest.items) || typeof lookupAssetFn !== 'function') {
      return Promise.resolve([]);
    }

    return Promise.all(
      manifest.items.map(function (item, index) {
        var filename = item && item.source && item.source.filename;
        if (!filename) return null;
        var handle = lookupAssetFn(filename);
        if (!handle || typeof handle.getFile !== 'function') {
          // 素材不存在——不偽造內容，留給 Runtime 端在上傳階段判定
          // asset_not_expected／資料不完整（見 spx_ad_runtime.py 的
          // create_execution／receive_asset）。
          return null;
        }
        return handle
          .getFile()
          .then(function (file) { return file.arrayBuffer(); })
          .then(function (buffer) {
            return { assetId: String(index), filename: filename, buffer: buffer };
          })
          .catch(function () { return null; });
      })
    ).then(function (results) {
      return results.filter(Boolean);
    });
  }

  global.BNAIWorkflowManifestBuild = {
    buildFirstRunManifest: buildFirstRunManifest,
    buildRerunManifest: buildRerunManifest,
    collectAssetPayloads: collectAssetPayloads,
  };
})(window);

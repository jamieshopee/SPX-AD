// AI Workflow — Status Polling Module
// Coding Phase 3／7：Status Polling + Auto Import
// Phase 6（本輪）：Error / Recovery Hardening — 情境 D（Status Polling
//   Failure）。既有版本把「連線失敗」與「Runtime 明確回 404（executionId
//   不存在）」一律視為同一種「這次跳過，下一次照常排程」，會無限快速重試、
//   永遠不會有明確的 Failure State。本輪修正：
//     1. 區分三種查詢結果：ok（正常拿到 status）／notFound（Runtime 明確
//        回 404，executionId 已不存在——重試永遠不會成功，必須立刻停止並
//        回報，不得再排下一次）／transient（連線失敗或其他非 2xx——可能只
//        是暫時的，允許重試，但有上限與退避）。
//     2. transient 連續發生達 MAX_CONSECUTIVE_TRANSIENT_FAILURES 次後，停止
//        輪詢並回報明確的 Failure（不得無限快速重試）；每多失敗一次，下一
//        次排程的等待時間依 BACKOFF_MULTIPLIERS 拉長（簡單退避，不是無限快
//        速重試）。
//     3. 新增 onFailure(kind) callback（kind: 'not_found' | 'unavailable'）
//        給呼叫方（Workflow State Machine），讓它決定要進入哪個 Failure
//        State、如何提供 Retry——本檔案不知道、也不決定 Recovery UI 或
//        Retry 策略本身。
//
// 依據（Locked，不重新設計）：
//   docs/proposals/Photoshop-Automation-Proposal.md（Status Contract）
//   AI Workflow Implementation Proposal（Revision 01, Frozen）第 9 節
//
// 本檔案範圍：
//   - Processing 狀態期間，重複呼叫 SPX AD Runtime 的 Status Contract
//     （GET /status/{executionId} -> { state, progress, lastResult }）。
//   - 具備明確的開始（start）、停止（stop）與重入保護：start() 在已輪詢時
//     不會建立第二條輪詢迴圈；stop() 之後即使先前排程的請求才剛回來，也
//     不會再排下一次輪詢。
//   - 使用 setTimeout 遞迴排程（不用 setInterval），確保永遠是「上一次
//     請求回來後才排下一次」，不會因為請求變慢而疊加出多個併發請求
//     （避免重複輪詢／資源洩漏）。
//
// 本檔案不得：
//   - 修改 Status Contract 的回應形狀。
//   - 決定 Completed／PartialFailure／Failure 之後要做什麼，也不決定
//     not_found／unavailable 之後的 Retry 策略或使用者文案——本檔案只負責
//     把每次輪詢結果（成功或分類後的失敗）回傳給呼叫方，不自己詮釋。
//   - 知道 SPX AD Runtime、Platform Adapter 或任何平台實作細節，只知道
//     GET http://127.0.0.1:8901/status/{executionId} 這一個 HTTP 端點。

(function (global) {
  'use strict';

  if (global.BNAIWorkflowStatusPolling) return;

  var BASE_URL = 'http://127.0.0.1:8901';
  var DEFAULT_INTERVAL_MS = 1000;

  // Phase 6：集中常數，不散落 magic number。
  var MAX_CONSECUTIVE_TRANSIENT_FAILURES = 5;
  // 每次連續 transient 失敗後，下一次排程的等待時間乘數（簡單退避，非無限
  // 快速重試）；超過陣列長度時沿用最後一個值。
  var BACKOFF_MULTIPLIERS = [1, 1, 2, 3, 4];

  var polling = false;
  var timerId = null;
  var intervalMs = DEFAULT_INTERVAL_MS;
  var currentExecutionId = null;
  var consecutiveTransientFailures = 0;

  function queryStatus(executionId) {
    return fetch(BASE_URL + '/status/' + encodeURIComponent(executionId), { method: 'GET' })
      .then(function (res) {
        if (res.status === 404) {
          return { kind: 'notFound' };
        }
        if (!res.ok) {
          return { kind: 'transient' };
        }
        return res
          .json()
          .then(function (data) {
            return data ? { kind: 'ok', data: data } : { kind: 'transient' };
          })
          .catch(function () {
            return { kind: 'transient' };
          });
      })
      .catch(function () {
        // Runtime 暫時無法連線：分類為 transient，允許依退避策略重試，但有
        // 上限（見 tick()）。
        return { kind: 'transient' };
      });
  }

  function backoffDelay() {
    var idx = Math.min(consecutiveTransientFailures, BACKOFF_MULTIPLIERS.length - 1);
    return intervalMs * BACKOFF_MULTIPLIERS[idx];
  }

  function scheduleNext(onUpdate, onFailure, delay) {
    if (!polling) return; // stop() 可能已在請求進行中被呼叫
    timerId = setTimeout(function () {
      tick(onUpdate, onFailure);
    }, delay != null ? delay : intervalMs);
  }

  function tick(onUpdate, onFailure) {
    if (!polling) return;
    queryStatus(currentExecutionId).then(function (result) {
      if (!polling) return; // 請求進行期間 stop() 可能已被呼叫，不再繼續

      if (result.kind === 'ok') {
        consecutiveTransientFailures = 0;
        if (typeof onUpdate === 'function') {
          try {
            onUpdate(result.data);
          } catch (e) {
            // 呼叫方（Workflow State Machine）的例外不應該讓輪詢迴圈本身掛掉。
          }
        }
        scheduleNext(onUpdate, onFailure, intervalMs);
        return;
      }

      if (result.kind === 'notFound') {
        // executionId 已不存在（Runtime 端已無此紀錄）：重試輪詢本身永遠不
        // 會成功，立刻停止，交給呼叫方決定 Recovery（不得再排下一次）。
        polling = false;
        currentExecutionId = null;
        if (timerId != null) {
          clearTimeout(timerId);
          timerId = null;
        }
        if (typeof onFailure === 'function') {
          try {
            onFailure('not_found');
          } catch (e) {
            // 不讓呼叫方例外影響本模組已經停止輪詢的事實。
          }
        }
        return;
      }

      // transient：允許重試，但有上限與退避，不得無限快速重試。
      consecutiveTransientFailures += 1;
      if (consecutiveTransientFailures >= MAX_CONSECUTIVE_TRANSIENT_FAILURES) {
        polling = false;
        currentExecutionId = null;
        if (timerId != null) {
          clearTimeout(timerId);
          timerId = null;
        }
        if (typeof onFailure === 'function') {
          try {
            onFailure('unavailable');
          } catch (e) {
            // 同上。
          }
        }
        return;
      }
      scheduleNext(onUpdate, onFailure, backoffDelay());
    });
  }

  function start(executionId, onUpdate, onFailure, options) {
    if (polling) return; // 重入保護：已在輪詢就不建立第二條輪詢迴圈
    options = options || {};
    currentExecutionId = executionId;
    intervalMs = options.intervalMs > 0 ? options.intervalMs : DEFAULT_INTERVAL_MS;
    consecutiveTransientFailures = 0;
    polling = true;
    tick(onUpdate, onFailure);
  }

  function stop() {
    polling = false;
    currentExecutionId = null;
    consecutiveTransientFailures = 0;
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function isPolling() {
    return polling;
  }

  global.BNAIWorkflowStatusPolling = {
    start: start,
    stop: stop,
    isPolling: isPolling,
  };
})(window);

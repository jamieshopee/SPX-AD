(function (global) {
  if (global.BNAssetEditSession) return;

  var MAX_UNDO = 20;

  function createSession(reviewAsset, sources) {
    var processed = sources?.processed || '';
    return {
      assetKey: reviewAsset?.assetKey || '',
      reviewAsset: reviewAsset || null,
      sources: {
        original: sources?.original || '',
        processed: processed,
      },
      currentImage: processed,
      savedImage: processed,
      savedImageSize: { width: 0, height: 0 },
      viewMode: 'processed',
      currentTool: 'pan',
      dirty: false,
      undoStack: [],
      cropDraft: null,
      brush: { mode: 'hard', size: 40 },
      zoom: 1,
      pan: { x: 0, y: 0 },
      image: {
        naturalWidth: 0,
        naturalHeight: 0,
      },
    };
  }

  function destroySession(session) {
    if (!session) return;
    session.reviewAsset = null;
    session.sources = null;
    session.currentImage = '';
    session.savedImage = '';
    session.savedImageSize = { width: 0, height: 0 };
    session.undoStack = [];
    session.cropDraft = null;
  }

  function cloneImageState(session) {
    return {
      currentImage: session.currentImage,
      sources: { processed: session.sources?.processed || '' },
      image: {
        naturalWidth: session.image?.naturalWidth || 0,
        naturalHeight: session.image?.naturalHeight || 0,
      },
      dirty: !!session.dirty,
    };
  }

  function pushUndo(session) {
    if (!session) return session;
    session.undoStack.push(cloneImageState(session));
    if (session.undoStack.length > MAX_UNDO) session.undoStack.shift();
    return session;
  }

  function discardLastUndo(session) {
    if (!session || !session.undoStack.length) return session;
    session.undoStack.pop();
    return session;
  }

  function undo(session) {
    if (!session || !session.undoStack.length) return { ok: false, session: session };
    var snapshot = session.undoStack.pop();
    session.currentImage = snapshot.currentImage || session.currentImage;
    if (session.sources) session.sources.processed = snapshot.sources?.processed || session.currentImage;
    session.image = {
      naturalWidth: snapshot.image?.naturalWidth || session.image?.naturalWidth || 0,
      naturalHeight: snapshot.image?.naturalHeight || session.image?.naturalHeight || 0,
    };
    session.dirty = !!snapshot.dirty;
    session.cropDraft = null;
    return { ok: true, session: session };
  }

  function setViewMode(session, mode) {
    if (!session) return session;
    session.viewMode = mode === 'original' ? 'original' : 'processed';
    if (session.viewMode === 'original') session.cropDraft = null;
    return session;
  }

  function setTool(session, tool) {
    if (!session) return session;
    session.currentTool = tool || 'pan';
    if (session.currentTool !== 'crop') session.cropDraft = null;
    return session;
  }

  function setViewport(session, viewport) {
    if (!session || !viewport) return session;
    if (Number.isFinite(viewport.zoom)) session.zoom = viewport.zoom;
    if (viewport.pan) {
      session.pan = {
        x: Number.isFinite(viewport.pan.x) ? viewport.pan.x : session.pan.x,
        y: Number.isFinite(viewport.pan.y) ? viewport.pan.y : session.pan.y,
      };
    }
    return session;
  }

  function setImageSize(session, width, height) {
    if (!session) return session;
    session.image = {
      naturalWidth: Number.isFinite(width) ? width : 0,
      naturalHeight: Number.isFinite(height) ? height : 0,
    };
    return session;
  }

  function setCurrentImage(session, dataUrl, width, height) {
    if (!session || !dataUrl) return session;
    session.currentImage = dataUrl;
    if (session.sources) session.sources.processed = dataUrl;
    setImageSize(session, width, height);
    return session;
  }

  function setDirty(session, dirty) {
    if (!session) return session;
    session.dirty = !!dirty;
    return session;
  }

  function saveSession(session) {
    if (!session) return { ok: false, session: session };
    var image = session.currentImage || session.sources?.processed || '';
    session.savedImage = image;
    session.savedImageSize = {
      width: session.image?.naturalWidth || session.savedImageSize?.width || 0,
      height: session.image?.naturalHeight || session.savedImageSize?.height || 0,
    };
    if (session.sources) session.sources.processed = image;
    session.currentImage = image;
    session.dirty = false;
    return {
      ok: !!image,
      session: session,
      dataUrl: image,
      width: session.savedImageSize.width,
      height: session.savedImageSize.height,
    };
  }

  function discardToSaved(session) {
    if (!session) return { ok: false, session: session };
    var image = session.savedImage || session.sources?.processed || session.currentImage || '';
    session.currentImage = image;
    if (session.sources) session.sources.processed = image;
    session.image = {
      naturalWidth: session.savedImageSize?.width || session.image?.naturalWidth || 0,
      naturalHeight: session.savedImageSize?.height || session.image?.naturalHeight || 0,
    };
    session.dirty = false;
    session.cropDraft = null;
    session.undoStack = [];
    return {
      ok: !!image,
      session: session,
      dataUrl: image,
      width: session.image.naturalWidth,
      height: session.image.naturalHeight,
    };
  }

  function setBrush(session, brush) {
    if (!session) return session;
    session.brush = session.brush || { mode: 'hard', size: 40 };
    if (brush && /^(hard|soft)$/.test(String(brush.mode || ''))) session.brush.mode = brush.mode;
    if (brush && Number.isFinite(Number(brush.size))) session.brush.size = Math.max(8, Math.min(160, Number(brush.size)));
    return session;
  }

  function getActiveSource(session) {
    if (!session?.sources) return '';
    return session.viewMode === 'original' ? session.sources.original : (session.currentImage || session.sources.processed);
  }

  global.BNAssetEditSession = {
    createSession: createSession,
    destroySession: destroySession,
    discardLastUndo: discardLastUndo,
    discardToSaved: discardToSaved,
    getActiveSource: getActiveSource,
    pushUndo: pushUndo,
    saveSession: saveSession,
    setCurrentImage: setCurrentImage,
    setBrush: setBrush,
    setDirty: setDirty,
    setImageSize: setImageSize,
    setTool: setTool,
    setViewMode: setViewMode,
    setViewport: setViewport,
    undo: undo,
  };
})(window);

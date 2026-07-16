/*
 * TEMPORARY — Windows Minimal JSX Load Verification (Proposal Freeze
 * 2026-07-15-freeze-03). Not part of the Photoshop Pipeline. Used only to
 * verify, via an A/B swap of windows_adapter.py's JSX_PATH, whether
 * $.evalFile() itself can load and execute a JSX in this same folder,
 * independent of remove-background.jsx's own content. Does nothing else.
 * Delete this file once Windows validation is complete.
 */
$.global.__SPX_PS_DEBUG_PHASE__ = 'C';
throw new Error('SPX_PHASE_C_PROBE');

// Stub module for the browser inline visual editor.
// This file is requested as an ES module from edit-mode-script.js.
// We export POPUP_STYLES to satisfy the import and avoid runtime errors.

export const POPUP_STYLES = '';

// Optional global flag, not required for core app behavior.
window.__VISUAL_EDITOR_CONFIG__ = window.__VISUAL_EDITOR_CONFIG__ || {
  enabled: false,
};

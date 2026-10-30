// The package's public API: what `@emmettito/overlay-scrollbar` exports. Everything else is internal and may change.
// The stylesheet is its own export: `@emmettito/overlay-scrollbar/overlay-scrollbar.css`.
export type { OverlayScrollbarOptions } from './models/overlay-scrollbar-options.js';
export type { OverlayScrollbarRef } from './models/overlay-scrollbar-ref.js';
export { attachOverlayScrollbar, autoAttachOverlayScrollbars } from './overlay-scrollbar.js';

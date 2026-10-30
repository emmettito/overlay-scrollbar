# overlay-scrollbar

Overlay scrollbars for any scrollable element, in plain TypeScript with no dependencies.

The bars show wherever there's a mouse or trackpad. Touch-only devices, and browsers without CSS anchor positioning, keep their native scrollbars.

## Install

The package isn't on npm. Build it from this repository, then install the file it writes:

```sh
npm run package
npm install <path to>/overlay-scrollbar-<version>.tgz
```

## Use

Include the stylesheet first. Without it, the native scrollbars are hidden and no bars show.

```ts
import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
```

If your build doesn't import CSS from JavaScript, add the file to its global stylesheets or link to it from the page.

The styles sit in the `overlay-scrollbar` cascade layer, so any of your own styles override them. That layer has to come first: include the stylesheet before any other, or list it first in your layer order, e.g. `@layer overlay-scrollbar, base, components;`.

Then attach the bars to an element with `overflow: auto` or `scroll`:

```ts
import { attachOverlayScrollbar } from '@emmettito/overlay-scrollbar';

const scrollbar = attachOverlayScrollbar(element, { hideAfterScroll: 1000 });
scrollbar.update(); // after a size change the bars can't see (see Limits)
scrollbar.destroy(); // removes the bars and restores the element
```

- Scrolling stays native: the library hides the element's own scrollbars and draws thin bars over its content. By default they widen when the pointer rests on them and fade out shortly after scrolling stops.
- The bars follow the element's size, content and text direction on their own.
- Attaching to the same element again replaces its bars, e.g. with new options.
- An element attached before it's in the page gets its bars once it's added.
- In a component, attach the bars once the element has rendered, again when the options change, and destroy them when the element is removed.
- The page itself can't have bars (`document.documentElement`, or the body while it scrolls the page). Put the page's content in a scrolling element of its own instead.

### Attaching by selector

```ts
import { autoAttachOverlayScrollbars } from '@emmettito/overlay-scrollbar';

const stop = autoAttachOverlayScrollbars('.scroll-y', document.body);
```

This attaches bars to every matching element under the root, now and as elements are added or removed or change the classes, ids or attributes the selector names. If the DOM under the root changes constantly (a virtual list, a live feed), pass the narrowest root that holds the elements.

## Options

| Option            | Default | Description                                                                                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoHide`        | `true`  | `true` hides the bars until scrolling or the pointer shows them. `'leave'` shows them while the pointer is on the element. `false` never hides them. |
| `hoverDelay`      | `80`    | How long the pointer rests on a bar before it widens, in ms                                                                                          |
| `hideAfterScroll` | `700`   | How long a bar stays after scrolling stops, in ms                                                                                                    |
| `hideAfterLeave`  | `500`   | How long a bar stays after the pointer leaves it, in ms                                                                                              |
| `minThumbLength`  | `20`    | The shortest a thumb gets, in px                                                                                                                     |
| `force`           | `false` | Draws the bars on touch-only devices too                                                                                                             |

## Theming

Set these custom properties on the element or an ancestor. If you change them without resizing anything (e.g. by switching a theme class), call `update()`.

| Property                                | Default                                                 | Description                                                                             |
| --------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `--overlay-scrollbar-width`             | `6px`                                                   | The thumb while scrolling                                                               |
| `--overlay-scrollbar-expanded-width`    | `11px`                                                  | The track and thumb while the pointer is on the bar                                     |
| `--overlay-scrollbar-inset`             | `3px`                                                   | The gap between the bars and the element's edges                                        |
| `--overlay-scrollbar-radius`            | the expanded width                                      | The corners of the thumb and track                                                      |
| `--overlay-scrollbar-thumb-color`       | `rgb(0 0 0 / 0.5)`                                      | The thumb                                                                               |
| `--overlay-scrollbar-thumb-hover-color` | `rgb(0 0 0 / 0.6)`                                      | The thumb under the pointer, or being dragged                                           |
| `--overlay-scrollbar-track-color`       | `rgb(0 0 0 / 0.047)`                                    | The track, shown only while the bar is expanded                                         |
| `--overlay-scrollbar-corner`            | `0`, or room for the other bar if `autoHide` is `false` | How far each bar stops short of the corner where both show                              |
| `--overlay-scrollbar-fade-duration`     | `0.25s`                                                 | The fade-out                                                                            |
| `--overlay-scrollbar-fade-in-duration`  | `0.2s`                                                  | The fade-in when the pointer enters the element (`autoHide: 'leave'`)                   |
| `--overlay-scrollbar-idle-opacity`      | `0`                                                     | The thin thumb's opacity while not in use. Around `0.3` hints that the element scrolls. |
| `--overlay-scrollbar-expand-duration`   | `0.15s`                                                 | Widening and narrowing                                                                  |

For example, light bars on a dark panel:

```css
.dark-panel {
  --overlay-scrollbar-thumb-color: rgb(255 255 255 / 0.5);
  --overlay-scrollbar-thumb-hover-color: rgb(255 255 255 / 0.6);
  --overlay-scrollbar-track-color: rgb(255 255 255 / 0.1);
}
```

For anything else, style these classes: `.overlay-scrollbar-bar` (with `.overlay-scrollbar-bar-x`/`-y`, `.overlay-scrollbar-visible` and `.overlay-scrollbar-expanded`), its `::before` (the track), and `.overlay-scrollbar-thumb`. Other `overlay-scrollbar-` classes are internal and may change. The bars are drawn in a frame inserted right after the element, so reach them with `+`:

```css
.dark-panel + .overlay-scrollbar-frame .overlay-scrollbar-thumb {
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.2);
}
```

Don't set `animation`, `translate` or `transform` on the thumb, because the library uses them to move it. Animate its `::before` and `::after` instead.

In forced-colours mode (Windows High Contrast), the bars use system colours so they stay visible.

## Server-side rendering

The library is safe to import on the server. Both functions do nothing there, so call them again in the browser once the element has rendered.

## Limits

- The bars notice the element and its children resizing, and text being added or removed. They miss size changes deeper down, inline children such as a `<span>` growing, and text edited in place, until the next scroll or hover, or `update()`.
- The stylesheet makes the element `position: relative` (unless you position it yourself), so absolutely positioned dropdowns or tooltips inside it are clipped by it and scroll with it. Give those `position: fixed`, or put them in the top layer (`popover`, `<dialog>`).
- The bars have `z-index: 999`, so they cover overlays with a lower z-index in the same stacking context, such as a sticky header. Give those a higher z-index, or put them in the top layer.
- Each bar takes the pointer along the element's edge (14px by default) even while it's hidden, so a click there scrolls the element rather than reaching the content beneath.
- The frame is a sibling after the element, so the element is no longer `:last-child`, and `+`, `~` and `:nth-child()` see the frame. It's absolutely positioned, so it doesn't affect flex or grid layout.
- Moving the element leaves its frame behind: destroy the bars and attach them again. Don't attach bars to the root element of a list item that can be reordered.
- In Firefox, the frame doesn't follow a `transform` or `translate` on the element.
- Inside a scrolling element without bars of its own, the bars are clipped by it only if it's positioned.
- Nested elements' bars stack above their parents' only when no stacking context sits between them.
- Only Safari shortens the thumb while rubber-banding past an end.

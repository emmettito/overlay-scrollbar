# overlay-scrollbar

Overlay scrollbars for any scrollable element, in plain TypeScript with no dependencies.

The bars show wherever there's a mouse or trackpad. Touch-only devices, and browsers without CSS anchor positioning, keep their native scrollbars.

See them in the [demo app](https://emmettito.github.io/overlay-scrollbar/).

## Install

```sh
npm install @emmettito/overlay-scrollbar
```

## Use

Include the stylesheet first. Without it, no bars show, and the native scrollbars stay.

```ts
import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
```

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
- They work in right-to-left and vertical text (`writing-mode`): each thumb starts where the content does, and the bars go where Chrome puts its own scrollbars, at the bottom and on the right (on the left in right-to-left horizontal text).
- A right-click on a bar, or Control-click on a Mac, neither scrolls nor opens a context menu, as on native scrollbars.
- Attaching to the same element again replaces its bars, e.g. with new options.
- Call `destroy()` when you remove the element, or are done with it. Until then the bars keep references to the element, so it can't be garbage-collected, and their frame, a sibling of the element, stays in the page. `autoAttachOverlayScrollbars()` and the framework wrappers destroy the bars for you.
- In a shadow root, load the stylesheet there too, with a `<link>` or `adoptedStyleSheets`: the page's stylesheets don't reach inside it.
- An element attached before it's in the page gets its bars once it's added.
- The page itself can't have bars (`document.documentElement`, or the body while it scrolls the page). Put the page's content in a scrolling element of its own instead.

### Attaching by selector

```ts
import { autoAttachOverlayScrollbars } from '@emmettito/overlay-scrollbar';

const stop = autoAttachOverlayScrollbars('.scroll-y', document.body);
```

This attaches bars to every matching element under the root, now and as elements are added or removed or change the classes, ids or attributes the selector names. If the DOM under the root changes constantly (a virtual list, a live feed), pass the narrowest root that holds the elements.

## Frameworks

The repository has a small wrapper for each of Angular, React, Vue and Svelte. They aren't in the package: copy the one you need into your app. Each attaches the bars once the element has rendered, attaches them again when the options change (compared by value, so options rebuilt on every render don't), and destroys them when the element goes.

| Framework | Wrapper                                                                                                                                            | Use                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Angular   | [`overlay-scrollbar.directive.ts`](https://github.com/emmettito/overlay-scrollbar/blob/main/frameworks/angular/src/overlay-scrollbar.directive.ts) | `<div [overlayScrollbar]="options">`                          |
| React     | [`useOverlayScrollbar.ts`](https://github.com/emmettito/overlay-scrollbar/blob/main/frameworks/react/src/useOverlayScrollbar.ts)                   | `const ref = useOverlayScrollbar(options)`, `<div ref={ref}>` |
| Vue       | [`vOverlayScrollbar.ts`](https://github.com/emmettito/overlay-scrollbar/blob/main/frameworks/vue/src/vOverlayScrollbar.ts)                         | `<div v-overlay-scrollbar="options">`                         |
| Svelte    | [`overlayScrollbar.ts`](https://github.com/emmettito/overlay-scrollbar/blob/main/frameworks/svelte/src/overlayScrollbar.ts)                        | `<div use:overlayScrollbar={options}>`                        |

The demo app has a page for each, showing it in use.

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

Set these custom properties on the element or an ancestor. Changes on an ancestor, e.g. a theme class switched on the page, are followed at once. Ones set on the element itself are picked up when the element next resizes or the pointer comes onto the bars; to show a change at once, call `update()`.

| Property                  | Default                                                 | Description                                                                             |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `--osb-width`             | `6px`                                                   | The thumb while scrolling                                                               |
| `--osb-expanded-width`    | `11px`                                                  | The track and thumb while the pointer is on the bar                                     |
| `--osb-inset`             | `3px`                                                   | The gap between the bars and the element's edges                                        |
| `--osb-radius`            | the expanded width                                      | The corners of the thumb and track                                                      |
| `--osb-thumb-color`       | `rgb(0 0 0 / 0.5)`, white in a dark colour scheme       | The thumb                                                                               |
| `--osb-thumb-hover-color` | `rgb(0 0 0 / 0.6)`, white in a dark colour scheme       | The thumb under the pointer, or being dragged                                           |
| `--osb-track-color`       | `rgb(0 0 0 / 0.047)`, white in a dark colour scheme     | The track, shown only while the bar is expanded                                         |
| `--osb-corner`            | `0`, or room for the other bar if `autoHide` is `false` | How far each bar stops short of the corner where both show                              |
| `--osb-fade-duration`     | `0.25s`                                                 | The fade-out                                                                            |
| `--osb-fade-in-duration`  | `0.2s`                                                  | The fade-in when the pointer enters the element (`autoHide: 'leave'`)                   |
| `--osb-idle-opacity`      | `0`                                                     | The thin thumb's opacity while not in use. Around `0.3` hints that the element scrolls. |
| `--osb-expand-duration`   | `0.15s`                                                 | Widening and narrowing                                                                  |

The default colours follow the element's `color-scheme`, so an element with `color-scheme: dark` gets light bars. For a dark panel that doesn't set it:

```css
.dark-panel {
  --osb-thumb-color: rgb(255 255 255 / 0.5);
  --osb-thumb-hover-color: rgb(255 255 255 / 0.6);
  --osb-track-color: rgb(255 255 255 / 0.1);
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

## Accessibility

Scrolling stays native, so keyboard scrolling, screen readers and find-in-page work as they would without the bars. The bars are hidden from assistive technology, and nothing in them takes focus. Some defaults favour a light look over making scrolling obvious; these settings change that.

- **Users who chose always-visible scrollbars.** Windows ("Always show scrollbars") and macOS ("Show scroll bars: Always") let people keep scrollbars on screen. Browsers don't tell pages about that setting, and from the page it looks the same as having a mouse connected, so the bars hide by default either way. If your users need to see that an area scrolls, use `autoHide: 'leave'` or `false`, or give the thin thumb a resting opacity with `--osb-idle-opacity: 0.3`.
- **Target size.** An expanded bar is 14px wide to click (11px plus the 3px inset), below the 24px that WCAG 2.5.8 asks for. Wheel, keyboard and touch scrolling are alternatives, but for users who drag thumbs, raise `--osb-expanded-width` to 17px (the width of Windows' own scrollbars) or more.

## Server-side rendering

The library is safe to import on the server. Both functions do nothing there, so call them again in the browser once the element has rendered.

## Limits

- The bars notice the element and its children resizing, and text being added or removed. They miss size changes deeper down, inline children such as a `<span>` growing, and text edited in place, until the next scroll or hover, or `update()`.
- The stylesheet hides the element's native scrollbars with `scrollbar-width: none !important`. Only an inline `scrollbar-width` with `!important` on the element overrides that, and it brings the native scrollbars back under the bars.
- The stylesheet makes the element `position: relative` (unless you position it yourself), so absolutely positioned dropdowns or tooltips inside it are clipped by it and scroll with it. Give those `position: fixed`, or put them in the top layer (`popover`, `<dialog>`).
- The bars have `z-index: 999`, so they cover overlays with a lower z-index in the same stacking context, such as a sticky header. Give those a higher z-index, or put them in the top layer.
- Each bar takes the pointer along the element's edge (14px by default) even while it's hidden, so a click there scrolls the element rather than reaching the content beneath, with nothing on screen to show why. Keep links, checkboxes and other controls clear of a scrolling element's right and bottom edges, for example with `padding-right: 14px` (`padding-left` in right-to-left horizontal text, where the vertical bar is on the left).
- The frame is a sibling after the element, so the element is no longer `:last-child`, and `+`, `~` and `:nth-child()` see the frame. It's absolutely positioned, so it doesn't affect flex or grid layout.
- The bars add their own names to the element's `anchor-name` and `scroll-timeline`, and to its parent's `timeline-scope`, as inline styles that keep the stylesheet's names alongside. Those are copied when the bars are drawn, so if the stylesheet later changes them (a class toggled, a media query), the inline copies still apply over them: destroy the bars and attach them again.
- Moving the element leaves its frame behind: destroy the bars and attach them again. Don't attach bars to the root element of a list item that can be reordered.
- In Firefox, the frame doesn't follow a `transform` or `translate` on the element.
- Inside a scrolling element without bars of its own, the bars are clipped by it only if it's positioned.
- Nested elements' bars stack above their parents' only when no stacking context sits between them, and not across a shadow root's boundary.
- Only Safari shortens the thumb while rubber-banding past an end.
- The track behaves as on macOS on every platform: a click pages towards it, and Option-click (Alt-click) jumps to the spot. Linux's convention, where a click jumps and Shift-click pages, isn't followed, and pressing and holding on the track pages once rather than repeating.
- A change of `writing-mode`, of `direction` made in CSS rather than with the `dir` attribute, or of a `color-scheme` set on the element itself rather than on the page, is picked up when the element next resizes or the pointer comes onto the bars, or on `update()`. A `color-scheme` the element inherits, e.g. from a dark theme on the page, is followed at once.

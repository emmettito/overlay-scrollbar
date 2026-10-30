# The framework demo

The same small demo in Angular, React, Vue and Svelte, to show how each uses the library. Keep all four identical:
same markup, same class names, same behaviour, styled by `demo.css` in this folder.

```html
<div class="demo">
  <div class="controls">
    <button type="button">Add 10 items</button>
    <button type="button">Remove 10 items</button>
    <label><input type="checkbox" /> Keep the bars showing</label>
    <span class="count">30 items</span>
  </div>
  <div class="list"><!-- the library is attached here, with { autoHide: !keepShowing } -->
    <div class="row">This first row is wide enough to scroll sideways as well, so both bars show</div>
    <div class="row">Item 1</div>
    …
    <div class="row">Item 30</div>
  </div>
</div>
```

- Starts with 30 items. "Add 10 items" appends Item 31…40 and so on; "Remove 10 items" removes the last 10, never
  going below 0. The count reads "N items".
- "Keep the bars showing" is unchecked to start. It sets the `autoHide` option: checked means `{ autoHide: false }`.
  Changing it re-attaches the bars with the new options.
- The bars are attached through each framework's idiomatic wrapper, which attaches on mount, re-attaches when the
  options change, and destroys on unmount:
  - Angular: a directive, `[overlayScrollbar]="options"`
  - React: a hook, `const ref = useOverlayScrollbar(options)`
  - Vue: a directive, `v-overlay-scrollbar="options"`
  - Svelte: an action, `use:overlayScrollbar={options}`
- Each imports the library by its package name, `@emmettito/overlay-scrollbar` (pointed at `src/overlay-scrollbar` by
  the demo's Vite and TypeScript configs), and its stylesheet as `@emmettito/overlay-scrollbar/overlay-scrollbar.css`,
  as an app would.
- Each wrapper has a spec next to it covering those three: drawing on mount, drawing again only when the options
  change, and removing the bars on unmount.

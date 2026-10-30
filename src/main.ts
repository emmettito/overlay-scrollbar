// organize-imports-ignore: the order below matters, and Prettier's organize-imports plugin would sort it.
// The library's stylesheet goes first: its rules sit in a cascade layer, and the layer declared first loses to every
// other, including those the pages' own stylesheets declare (the Styling page's layered override).
import './overlay-scrollbar/overlay-scrollbar.css';
// The app's fonts, bundled into the build rather than loaded from elsewhere
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/inter';
import './styles.css';
import { changingContent, dialog, list, table } from './demos/compare';
import { dragDrop } from './demos/drag-drop';
import { home } from './demos/home';
import { nested } from './demos/nested';
import { find, Page } from './demos/page';
import { rtl } from './demos/rtl';
import { styling } from './demos/styling/styling';
import { virtual } from './demos/virtual';
import { navMenu } from './menu';
import { themeToggle } from './theme';

const pages: Record<string, Page> = {
  '': home,
  list,
  'changing-content': changingContent,
  table,
  dialog,
  nested,
  rtl,
  virtual,
  'drag-drop': dragDrop,
  styling
};

const main = find(document, 'main');
let leave: (() => void) | undefined;

// Hash URLs (index.html#/styling), so the built app works when opened straight from disk, without a server
function show(): void {
  const path = location.hash.replace(/^#\/?/, '');
  // Own keys only, so #/toString and the like aren't taken for pages
  const page = Object.hasOwn(pages, path) ? pages[path] : undefined;
  if (!page) {
    location.replace('#/');
    return;
  }
  leave?.();
  main.replaceChildren();
  leave = page.render(main);
  // The page's title, then the library's name; Home is titled with just the name
  document.title = path ? `${page.title} | overlay-scrollbar` : page.title;
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#/${path}`);
  });
}

themeToggle(find<HTMLButtonElement>(document, '.theme-toggle'));
navMenu(find<HTMLButtonElement>(document, '.menu-button'), find(document, '.nav-backdrop'));
addEventListener('hashchange', show);
show();

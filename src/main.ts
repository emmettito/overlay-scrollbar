// organize-imports-ignore: the order below matters, and Prettier's organize-imports plugin would sort it.
// The library's stylesheet goes first: its rules sit in a cascade layer, and the layer declared first loses to every
// other, including any the pages' own stylesheets declare.
import './overlay-scrollbar/overlay-scrollbar.css';
// The app's fonts, bundled into the build rather than loaded from elsewhere
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/inter';
import './styles.css';
import { changingContent, dialog, list, table } from './demos/compare';
import { dragDrop } from './demos/drag-drop';
import { frameworkPage } from './demos/framework-page';
import { home } from './demos/home';
import { nested } from './demos/nested';
import { Bars, find, Page } from './demos/page';
import { rtl } from './demos/rtl';
import { styling } from './demos/styling/styling';
import { virtual } from './demos/virtual';
import { navMenu } from './menu';
import { themeToggle } from './theme';

const pages: Record<string, Page> = {
  '': home,
  list,
  table,
  'changing-content': changingContent,
  nested,
  dialog,
  rtl,
  virtual,
  'drag-drop': dragDrop,
  styling,
  angular: frameworkPage('angular'),
  react: frameworkPage('react'),
  vue: frameworkPage('vue'),
  svelte: frameworkPage('svelte')
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
  // Main is what scrolls, rather than the page, so going to another page doesn't scroll back to the top by itself
  main.scrollTop = 0;
  leave = page.render(main);
  // The page's title, then the library's name; Home is titled with just the name
  document.title = path ? `${page.title} | overlay-scrollbar` : page.title;
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#/${path}`);
  });
}

// The app's own scrolling, main and the nav's links, with the library's bars rather than native ones. Not forced on,
// unlike the demos' library columns: on a touch-only device the native ones stay, as the library leaves them.
const bars = new Bars();
bars.attach(main, { force: false });
bars.attach(find(document, '.nav-links'), { force: false });

themeToggle(find<HTMLButtonElement>(document, '.theme-toggle'));
navMenu(find<HTMLButtonElement>(document, '.menu-button'), find(document, '.nav-backdrop'), main);
addEventListener('hashchange', show);
show();

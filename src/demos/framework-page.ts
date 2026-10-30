import { currentTheme } from '../theme';
import './framework-page.css';
import { Bars, html, Page, render } from './page';

export type Framework = 'angular' | 'react' | 'vue' | 'svelte';

interface FrameworkGuide {
  name: string;
  intro: string;
  /** Source files to show, in frameworks/<name>/src */
  files: string[];
}

const guides: Record<Framework, FrameworkGuide> = {
  angular: {
    name: 'Angular',
    intro:
      'A directive attaches the bars to its element once it has rendered, attaches them again when the options change, and removes them when the element is destroyed.',
    files: ['overlay-scrollbar.directive.ts', 'angular-demo.component.ts']
  },
  react: {
    name: 'React',
    intro:
      'A hook returns a ref for the scrollable element. It attaches the bars in an effect, attaches them again when the options change, and removes them on cleanup.',
    files: ['useOverlayScrollbar.ts', 'App.tsx']
  },
  vue: {
    name: 'Vue',
    intro:
      'A custom directive attaches the bars when its element is mounted, attaches them again when the options change, and removes them when it is unmounted.',
    files: ['vOverlayScrollbar.ts', 'App.vue']
  },
  svelte: {
    name: 'Svelte',
    intro:
      'An action attaches the bars to its element, attaches them again when the options change, and removes them when the element is destroyed.',
    files: ['overlayScrollbar.ts', 'App.svelte']
  }
};

// Each demo's source, as text, keyed by path (/frameworks/react/src/App.tsx). Leaves out the entry points, type
// declarations and specs, which aren't example code and aren't shown.
const sources = import.meta.glob<string>(['/frameworks/*/src/*', '!**/main.*', '!**/*.d.ts', '!**/*.spec.ts'], {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * The same small demo in each framework, with the code that makes it. Each demo is its own Vite app, built into
 * public/frameworks/<name>/ by `npm run frameworks`, and shown in an iframe.
 */
export function frameworkPage(framework: Framework): Page {
  const guide = guides[framework];
  return {
    title: guide.name,
    render(main) {
      render(
        main,
        html`
        <div class="framework-page">
          <h1>${guide.name}</h1>
          <p class="note">
            ${guide.intro} The library itself is plain TypeScript with no dependencies, so the same few lines work in any
            framework. Here it's imported by its package name, <code>@emmettito/overlay-scrollbar</code>, as in an app.
          </p>
          <section class="panel">
            <iframe src="frameworks/${framework}/index.html?theme=${currentTheme()}" title="${guide.name} demo"></iframe>
          </section>
          ${guide.files.map(
            file => html`
            <section>
              <h2>${file}</h2>
              <pre><code>${sources[`/frameworks/${framework}/src/${file}`] ?? 'Missing'}</code></pre>
            </section>
          `
          )}
        </div>
      `
      );
      // The demo's theme follows the app's: it starts with it, from the URL, and is sent each change, as the iframe
      // doesn't follow the app's color-scheme in every browser (frameworks/shared/theme.ts)
      const iframe = main.querySelector('iframe');
      const sendTheme = (): void => iframe?.contentWindow?.postMessage({ theme: currentTheme() }, '*');
      addEventListener('themechange', sendTheme);

      const bars = new Bars();
      bars.attachCode(main);
      return () => {
        removeEventListener('themechange', sendTheme);
        bars.destroy();
      };
    }
  };
}

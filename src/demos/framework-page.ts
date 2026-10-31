import '../../frameworks/shared/demo.css';
import './framework-page.css';
import { Bars, find, html, Page, render } from './page';

export type Framework = 'angular' | 'react' | 'vue' | 'svelte';

interface FrameworkGuide {
  name: string;
  intro: string;
  /** Source files to show, in frameworks/<name>/src */
  files: string[];
  /** The script that defines the demo's element, in frameworks/<name>/src */
  entry: string;
}

const guides: Record<Framework, FrameworkGuide> = {
  angular: {
    name: 'Angular',
    intro:
      'A directive attaches the bars to its element once it has rendered, attaches them again when the options change, and removes them when the element is destroyed.',
    files: ['overlay-scrollbar.directive.ts', 'angular-demo.component.ts'],
    entry: 'main.ts'
  },
  react: {
    name: 'React',
    intro:
      'A hook returns a ref for the scrollable element. It attaches the bars in an effect, attaches them again when the options change, and removes them on cleanup.',
    files: ['useOverlayScrollbar.ts', 'App.tsx'],
    entry: 'main.tsx'
  },
  vue: {
    name: 'Vue',
    intro:
      'A custom directive attaches the bars when its element is mounted, attaches them again when the options change, and removes them when it is unmounted.',
    files: ['vOverlayScrollbar.ts', 'App.vue'],
    entry: 'main.ts'
  },
  svelte: {
    name: 'Svelte',
    intro:
      'An action attaches the bars to its element, attaches them again when the options change, and removes them when the element is destroyed.',
    files: ['overlayScrollbar.ts', 'App.svelte'],
    entry: 'main.ts'
  }
};

// Each demo's source, as text, keyed by path (/frameworks/react/src/App.tsx). Leaves out the entry points, type
// declarations and specs, which aren't example code and aren't shown.
const sources = import.meta.glob<string>(['/frameworks/*/src/*', '!**/main.*', '!**/*.d.ts', '!**/*.spec.ts'], {
  query: '?raw',
  import: 'default',
  eager: true
});

// The frameworks whose demo's script the page has added, which defines its element for good
const loaded = new Set<Framework>();

/**
 * Adds the script that defines the demo's element, <angular-demo> and so on (frameworks/shared/define-demo.ts), once.
 * Built, it's the classic script `npm run frameworks` puts in public/frameworks/<name>/, which runs from disk. In dev,
 * it's the demo's entry, served as a module by the demo's own dev server (vite.config.ts), so it updates as you edit it.
 */
function loadDemo(framework: Framework): void {
  if (loaded.has(framework)) {
    return;
  }
  loaded.add(framework);
  const script = document.createElement('script');
  if (import.meta.env.DEV) {
    script.type = 'module';
    script.src = `frameworks/${framework}/src/${guides[framework].entry}`;
  } else {
    script.src = `frameworks/${framework}/demo.js`;
  }
  // A script that doesn't load (not built, or the demo's dev server not running) is logged, and tried again on the
  // framework's page next time
  script.onerror = (): void => {
    loaded.delete(framework);
    script.remove();
    console.error(`The ${framework} demo's script didn't load: ${script.src}`);
  };
  document.head.append(script);
}

/**
 * The same small demo in each framework, with the code that makes it. Each demo is its own Vite app, built by its own
 * framework's plugin into a script that defines an element, which the page shows as part of itself: in the app's
 * styles and theme, and as tall as it is.
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
          <section class="panel"></section>
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
      // Mounted once its script has defined the element, and unmounted when the page goes, taking the element with it
      loadDemo(framework);
      find(main, '.panel').append(document.createElement(`${framework}-demo`));

      const bars = new Bars();
      bars.attachCode(main);
      return () => bars.destroy();
    }
  };
}

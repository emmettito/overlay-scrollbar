// Light or dark as the app that shows the demo says, as data-theme on the root: first from the iframe's URL
// (?theme=dark), so it doesn't flash, then from the app's messages as its theme changes (src/demos/framework-page.ts).
// Opened on its own, the system's.
type Theme = 'light' | 'dark';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

function apply(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
}

/** Called before the demo renders. A call rather than an import for its effects, which the build would drop. */
export function followAppTheme(): void {
  const fromUrl = new URLSearchParams(location.search).get('theme');
  apply(isTheme(fromUrl) ? fromUrl : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  addEventListener('message', event => {
    const data: unknown = event.data;
    if (event.source === parent && typeof data === 'object' && data && 'theme' in data && isTheme(data.theme)) {
      apply(data.theme);
    }
  });
}

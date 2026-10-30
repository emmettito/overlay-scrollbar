// Light or dark, as data-theme on the root: the visitor's choice, kept in localStorage, or else the system's.
// index.html sets it before the page draws, so it doesn't flash; this keeps it up to date, and sends a themechange
// event when it changes.
type Theme = 'light' | 'dark';

const key = 'theme';
const system = matchMedia('(prefers-color-scheme: dark)');

function chosen(): Theme | undefined {
  try {
    const theme = localStorage.getItem(key);
    return theme === 'light' || theme === 'dark' ? theme : undefined;
  } catch {
    // Storage can be off, e.g. in a private window
    return undefined;
  }
}

export function currentTheme(): Theme {
  return document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  if (theme !== currentTheme()) {
    document.documentElement.dataset['theme'] = theme;
    dispatchEvent(new Event('themechange'));
  }
}

/** Makes `button` a switch between the themes: on for the dark one */
export function themeToggle(button: HTMLButtonElement): void {
  const reflect = (): void => {
    button.setAttribute('aria-checked', String(currentTheme() === 'dark'));
  };
  apply(chosen() ?? (system.matches ? 'dark' : 'light'));
  reflect();
  // Follows the system until the visitor chooses
  system.addEventListener('change', () => {
    if (!chosen()) {
      apply(system.matches ? 'dark' : 'light');
      reflect();
    }
  });
  button.addEventListener('click', () => {
    const theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(key, theme);
    } catch {
      // Not kept, but still switched
    }
    apply(theme);
    reflect();
  });
}

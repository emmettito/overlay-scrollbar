// The nav as a menu that slides out on narrow screens (see the media query in styles.css): opened by the menu button,
// closed by a link, the backdrop, Escape, or the screen growing wide enough for the sidebar. While it's open, focus
// moves into it and the page behind is inert, so the keyboard stays in the menu.
export function navMenu(button: HTMLButtonElement, backdrop: HTMLElement, main: HTMLElement): void {
  // Wider than the narrow screens' breakpoint, max-width: 720px in styles.css: change them together
  const wide = matchMedia('(min-width: 721px)');
  const isOpen = (): boolean => document.body.classList.contains('nav-open');
  const setOpen = (open: boolean): void => {
    document.body.classList.toggle('nav-open', open);
    button.setAttribute('aria-expanded', String(open));
    main.inert = open;
    if (open) {
      document.querySelector<HTMLElement>('nav a')?.focus();
    }
  };
  button.addEventListener('click', () => setOpen(!isOpen()));
  backdrop.addEventListener('click', () => setOpen(false));
  document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  wide.addEventListener('change', () => setOpen(false));
}

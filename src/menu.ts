// The nav as a menu that slides out on narrow screens (see the media query in styles.css): opened by the menu button,
// closed by a link, the backdrop, Escape, or the screen growing wide enough for the sidebar.
export function navMenu(button: HTMLButtonElement, backdrop: HTMLElement): void {
  const wide = matchMedia('(min-width: 721px)');
  const setOpen = (open: boolean): void => {
    document.body.classList.toggle('nav-open', open);
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setOpen(false);
      button.focus();
    }
  });
  wide.addEventListener('change', () => setOpen(false));
}

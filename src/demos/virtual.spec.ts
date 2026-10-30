import { VirtualList } from './virtual';

// jsdom has no layout, so the viewport's height and scroll position are set by hand: 420px, as on the page, so 12 rows
// of 36px fit with 5 more rendered beyond each end
function createViewport(): HTMLElement {
  const viewport = document.createElement('div');
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 420 },
    scrollTop: { configurable: true, writable: true, value: 0 }
  });
  return viewport;
}

const rows = (n: number): string[] => Array.from({ length: n }, (_, i) => `Row ${i}`);

describe('VirtualList', () => {
  let viewport: HTMLElement;
  let list: VirtualList;
  const rendered = (): string[] => Array.from(viewport.querySelectorAll('.row'), row => row.textContent ?? '');
  const scroll = (top: number): void => {
    viewport.scrollTop = top;
    viewport.dispatchEvent(new Event('scroll'));
  };

  beforeEach(() => {
    viewport = createViewport();
    list = new VirtualList(viewport);
  });

  it('makes the content as tall as every row, and renders only the rows in view and just beyond', () => {
    list.setRows(rows(100_000));
    expect((viewport.querySelector('.spacer') as HTMLElement).style.height).toBe('3600000px');
    // 0 to 11 in view, and 5 more after
    expect(rendered()).toEqual(rows(17));
  });

  it('renders the rows at the scroll position, placed over their place in the content', () => {
    list.setRows(rows(100_000));
    scroll(36 * 1000);
    expect(rendered()[0]).toBe('Row 995');
    expect(rendered().at(-1)).toBe('Row 1016');
    expect((viewport.querySelector('.window') as HTMLElement).style.top).toBe(`${36 * 995}px`);
  });

  it('stops at the last row', () => {
    list.setRows(rows(100));
    scroll(36 * 100);
    expect(rendered().at(-1)).toBe('Row 99');
    expect(rendered()).toHaveLength(5);
  });

  it('renders everything for a list shorter than the view', () => {
    list.setRows(rows(3));
    expect(rendered()).toEqual(rows(3));
  });

  it('jumps to a row, putting it at the top', () => {
    list.setRows(rows(100_000));
    list.scrollToIndex(5000);
    expect(viewport.scrollTop).toBe(180_000);
  });

  it('renders the new rows when they change, without waiting for a scroll', () => {
    list.setRows(rows(100));
    list.setRows(['Only row']);
    expect(rendered()).toEqual(['Only row']);
  });
});

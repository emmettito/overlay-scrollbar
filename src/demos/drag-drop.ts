import './drag-drop.css';
import { Bars, find, html, Html, Page, render } from './page';

// How near a list's top or bottom edge the pointer has to be for the list to scroll, in px, and how fast it then
// scrolls at most, in px per frame
const EDGE = 48;
const MAX_SPEED = 16;
// How far the pointer has to move before a press on a handle picks the item up, in px; a touch elsewhere on an item
// that moves this far before LONG_PRESS is up is scrolling instead
const SLOP = 4;
// How long a touch has to rest anywhere on an item to pick it up, in ms
const LONG_PRESS = 350;

/**
 * How far to scroll a list in one frame with the pointer at `y`: up or down, faster the nearer the pointer is to (or
 * the further past) its top or bottom edge, and not at all away from them.
 */
export function autoScrollSpeed(y: number, top: number, bottom: number): number {
  if (y < top + EDGE) {
    return -Math.ceil(MAX_SPEED * Math.min(1, (top + EDGE - y) / EDGE));
  }
  if (y > bottom - EDGE) {
    return Math.ceil(MAX_SPEED * Math.min(1, (y - bottom + EDGE) / EDGE));
  }
  return 0;
}

/** Where an item dropped at `y` goes among items with these vertical midpoints: before the first one below it */
export function dropIndex(midpoints: number[], y: number): number {
  const index = midpoints.findIndex(midpoint => y < midpoint);
  return index === -1 ? midpoints.length : index;
}

const contains = (rect: DOMRect, x: number, y: number): boolean =>
  x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;

/**
 * Lets the items in `board`'s lists be dragged by their handles, or on touch by a long press anywhere on them, within a
 * list and between them. The item itself becomes the placeholder, moved to where it would drop, while a copy follows
 * the pointer; near a list's top or bottom edge the list scrolls. Which list and where are worked out from where things
 * are on screen rather than from the element under the pointer, which along a list's edge is its bar, in the frame next
 * to it rather than in the list. Returns a function that stops it.
 */
export function enableDragging(board: HTMLElement, onDrop: () => void): () => void {
  const lists = [...board.querySelectorAll<HTMLElement>('.list')];
  let press: { item: HTMLElement; pointerId: number; x: number; y: number; handle: boolean } | undefined;
  let longPress: ReturnType<typeof setTimeout> | undefined;
  let drag:
    | { item: HTMLElement; ghost: HTMLElement; dx: number; dy: number; from: HTMLElement; before: Element | null }
    | undefined;
  let pointer = { x: 0, y: 0 };
  let frame = 0;

  // Moves the placeholder to where the pointer would drop it, in the list it's over (or the last one it was over)
  const place = (): void => {
    if (!drag) {
      return;
    }
    const { item } = drag;
    const list = lists.find(candidate => contains(candidate.getBoundingClientRect(), pointer.x, pointer.y));
    const target = list ?? (item.parentElement as HTMLElement);
    const others = [...target.querySelectorAll<HTMLElement>('.item')].filter(other => other !== item);
    const midpoints = others.map(other => {
      const rect = other.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    const before = others[dropIndex(midpoints, pointer.y)] ?? null;
    if (item.parentElement !== target || item.nextElementSibling !== before) {
      target.insertBefore(item, before);
    }
  };

  // Each frame while dragging: scrolls the list under the pointer when it's near an edge, which moves the items under
  // the pointer, so the placeholder is placed again
  const autoScroll = (): void => {
    const list = lists.find(candidate => {
      const rect = candidate.getBoundingClientRect();
      return pointer.x >= rect.left && pointer.x < rect.right;
    });
    if (list) {
      const rect = list.getBoundingClientRect();
      const speed = autoScrollSpeed(pointer.y, rect.top, rect.bottom);
      if (speed) {
        list.scrollBy({ top: speed, behavior: 'instant' });
        place();
      }
    }
    frame = requestAnimationFrame(autoScroll);
  };

  const start = (): void => {
    if (!press) {
      return;
    }
    const { item } = press;
    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true) as HTMLElement;
    ghost.classList.add('ghost');
    ghost.style.width = `${rect.width}px`;
    // In the board, so the page's styles for the items style it too; fixed, so not in its layout
    board.appendChild(ghost);
    drag = {
      item,
      ghost,
      dx: press.x - rect.left,
      dy: press.y - rect.top,
      from: item.parentElement as HTMLElement,
      before: item.nextElementSibling
    };
    // Over the item at once, as a long press starts the drag before the pointer moves
    ghost.style.translate = `${pointer.x - drag.dx}px ${pointer.y - drag.dy}px`;
    item.classList.add('placeholder');
    board.classList.add('dragging');
    frame = requestAnimationFrame(autoScroll);
  };

  const end = (cancel: boolean): void => {
    if (drag) {
      if (cancel) {
        drag.from.insertBefore(drag.item, drag.before);
      }
      drag.ghost.remove();
      drag.item.classList.remove('placeholder');
      board.classList.remove('dragging');
      cancelAnimationFrame(frame);
      drag = undefined;
      onDrop();
    }
    clearTimeout(longPress);
    press = undefined;
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerup', onPointerUp);
    removeEventListener('pointercancel', onPointerCancel);
    removeEventListener('keydown', onKeyDown);
    removeEventListener('blur', onBlur);
  };

  // Followed on the window rather than captured by the item, as moving the item between lists would lose the capture
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== press?.pointerId) {
      return;
    }
    pointer = { x: event.clientX, y: event.clientY };
    if (!drag && Math.hypot(pointer.x - press.x, pointer.y - press.y) >= SLOP) {
      // A touch that moves before its long press is up is scrolling the list
      if (press.handle) {
        start();
      } else {
        end(true);
        return;
      }
    }
    if (drag) {
      drag.ghost.style.translate = `${pointer.x - drag.dx}px ${pointer.y - drag.dy}px`;
      place();
    }
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === press?.pointerId) {
      end(false);
    }
  };
  const onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === press?.pointerId) {
      end(true);
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      end(true);
    }
  };
  // Switching to another app mid-drag: the release there never comes back as a pointerup, which would leave the drag
  // going, so it's put back as with Escape
  const onBlur = (): void => end(true);

  const onPointerDown = (event: PointerEvent): void => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('.item');
    const handle = !!target.closest('.handle');
    if (!item || event.button !== 0 || press || (!handle && event.pointerType !== 'touch')) {
      return;
    }
    if (handle) {
      // No text selection, and no compatibility mouse events
      event.preventDefault();
    }
    press = { item, pointerId: event.pointerId, x: event.clientX, y: event.clientY, handle };
    pointer = { x: event.clientX, y: event.clientY };
    if (!handle) {
      longPress = setTimeout(start, LONG_PRESS);
    }
    addEventListener('pointermove', onPointerMove);
    addEventListener('pointerup', onPointerUp);
    addEventListener('pointercancel', onPointerCancel);
    addEventListener('keydown', onKeyDown);
    addEventListener('blur', onBlur);
  };

  // Once a long press has picked an item up, the touch drags it rather than scrolling the list (touch-action can't
  // change mid-touch, but cancelling its moves can), and no callout or context menu opens
  const onTouchMove = (event: TouchEvent): void => {
    if (drag) {
      event.preventDefault();
    }
  };
  const onContextMenu = (event: Event): void => {
    if (press) {
      event.preventDefault();
    }
  };

  board.addEventListener('pointerdown', onPointerDown);
  board.addEventListener('touchmove', onTouchMove, { passive: false });
  board.addEventListener('contextmenu', onContextMenu);
  return () => {
    end(true);
    board.removeEventListener('pointerdown', onPointerDown);
    board.removeEventListener('touchmove', onTouchMove);
    board.removeEventListener('contextmenu', onContextMenu);
  };
}

const groceries = [
  'Apples',
  'Bananas',
  'Carrots',
  'Spinach',
  'Tomatoes',
  'Avocados',
  'Onions',
  'Potatoes',
  'Strawberries',
  'Lemons',
  'Milk',
  'Eggs',
  'Butter',
  'Cheddar',
  'Greek yogurt',
  'Sourdough bread',
  'Bagels',
  'Rice',
  'Pasta',
  'Olive oil',
  'Coffee beans',
  'Black tea',
  'Orange juice',
  'Oat milk',
  'Chicken thighs',
  'Salmon fillets',
  'Tofu',
  'Dark chocolate'
];

function item(name: string): Html {
  return html`
    <div class="item">
      <span class="handle" aria-hidden="true"></span>
      <span>${name}</span>
    </div>
  `;
}

function board(lib: boolean): Html {
  const marked = lib ? html`data-lib` : html``;
  const column = (title: string, items: string[]): Html => html`
    <div class="column">
      <h3>${title} <span class="count"></span></h3>
      <div class="list" ${marked}>${items.map(item)}</div>
    </div>
  `;
  const store = column('In the store', groceries.slice(0, 24));
  const cart = column('In the cart', groceries.slice(24));
  return html`<div class="board">${store}${cart}</div>`;
}

export const dragDrop: Page = {
  title: 'Drag and drop',
  render(main) {
    render(
      main,
      html`
      <div class="drag-drop">
        <h1>Drag and drop</h1>
        <p class="note">
          Drag groceries by their handles, or press and hold one on a touch screen, to move them within or between the
          lists. Hold one near a list's top or bottom edge to scroll it, and press Escape to put it back.
        </p>
        <div class="panels">
          <section><h3 class="label">Native</h3>${board(false)}</section>
          <section><h3 class="label">overlay-scrollbar</h3>${board(true)}</section>
        </div>
      </div>
    `
    );

    const counts = (): void =>
      main.querySelectorAll<HTMLElement>('.column').forEach(column => {
        find(column, '.count').textContent = `(${column.querySelectorAll('.item').length})`;
      });
    counts();
    const stops = [...main.querySelectorAll<HTMLElement>('.board')].map(element => enableDragging(element, counts));

    const bars = new Bars();
    bars.attachMarked(main);
    return () => {
      stops.forEach(stop => stop());
      bars.destroy();
    };
  }
};

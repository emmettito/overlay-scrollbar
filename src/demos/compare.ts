import './compare.css';
import { Bars, find, html, Html, Page, render } from './page';

// Made-up files, each with a type that suits it, and people and places to mix them with
const kinds: Record<string, string> = {
  docx: 'Document',
  xlsx: 'Spreadsheet',
  pptx: 'Presentation',
  pdf: 'PDF',
  jpg: 'Image',
  mp4: 'Video',
  mp3: 'Audio',
  zip: 'Archive',
  '': 'Folder'
};
const names = [
  ['Launch plan', 'docx'],
  ['Budget 2026', 'xlsx'],
  ['Team offsite', 'jpg'],
  ['Brand guidelines', 'pdf'],
  ['Q3 roadmap', 'pptx'],
  ['Customer interviews', 'mp3'],
  ['Product demo', 'mp4'],
  ['Release notes', 'docx'],
  ['Hiring plan', 'xlsx'],
  ['Design review', 'pptx'],
  ['Quarterly report', 'pdf'],
  ['Onboarding', ''],
  ['Pricing research', 'xlsx'],
  ['Board update', 'pptx'],
  ['Style guide', 'pdf'],
  ['Sprint retro', 'docx'],
  ['Marketing assets', 'zip'],
  ['Support playbook', 'docx'],
  ['Weekly sync recording', 'mp4'],
  ['Photos', '']
];
const people = ['Maya', 'Sam', 'Priya', 'Jonas', 'Lena', 'Theo', 'Ana', 'Kai', 'Noor'];
const places = ['Shared drive', 'Design', 'Finance', 'Marketing', 'Engineering', 'Archive'];
const months = ['Aug', 'Sep', 'Oct'];

interface File {
  id: number;
  name: string;
  kind: string;
  /** A folder has no size of its own */
  size: string;
  modified: string;
  owner: string;
  location: string;
}

/** The `id`th file: the names in turn, then again as later versions (Launch plan v2.docx) */
function file(id: number): File {
  const [base, extension] = names[(id - 1) % names.length];
  const version = Math.ceil(id / names.length);
  const name = version > 1 ? `${base} v${version}` : base;
  return {
    id,
    name: extension ? `${name}.${extension}` : name,
    kind: kinds[extension],
    size: extension ? `${((id * 37) % 500) + 12} KB` : '—',
    modified: `${months[id % months.length]} ${((id * 7) % 28) + 1}, 2026`,
    owner: people[(id * 5) % people.length],
    location: places[(id * 2) % places.length]
  };
}

const files = (from: number, count: number): File[] => Array.from({ length: count }, (_, i) => file(from + i));

// A recent-activity feed, long enough to scroll sideways
const actions = ['commented on', 'renamed', 'shared', 'moved', 'edited', 'starred', 'duplicated', 'restored'];
const rows = files(1, 30).map(
  (f, i) => `${f.owner} ${actions[(i * 3) % actions.length]} ${f.name} · ${(i % 9) + 1} min ago`
);

/** Native on the left, the library on the right: `box` gets the box's attributes (`data-lib` on the right) */
function sides(box: (attributes: Html) => Html): Html {
  return html`
    <div class="panels">
      ${[false, true].map(
        lib => html`
        <section>
          <h3 class="label">${lib ? 'overlay-scrollbar' : 'Native'}</h3>
          ${box(lib ? html`data-lib` : html``)}
        </section>
      `
      )}
    </div>
  `;
}

/** A comparison page's heading and note, which says which side is which */
function intro(title: string, note: string): Html {
  return html`
    <h1>${title}</h1>
    <p class="note">
      Native scrollbars on the left, the library's on the right. ${note}
    </p>
  `;
}

/** A page with one comparison, whose bars go with it */
function comparison(title: string, note: string, content: Html): Page {
  return {
    title,
    render(main) {
      render(main, html`<div class="compare">${intro(title, note)}${content}</div>`);
      const bars = new Bars();
      bars.attachMarked(main);
      return () => bars.destroy();
    }
  };
}

export const list = comparison(
  'List',
  'Try hovering the bars, dragging, flicking past the ends, and the arrow keys.',
  sides(lib => html`<div class="box" ${lib}>${rows.map(r => html`<p>${r}</p>`)}</div>`)
);

export const table = comparison(
  'Table',
  'A sticky header row, and columns wide enough to scroll sideways.',
  sides(
    lib => html`
    <div class="box" ${lib}>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Kind</th><th>Size</th><th>Modified</th><th>Owner</th><th>Location</th></tr></thead>
        <tbody>
          ${files(1, 30).map(
            f => html`
            <tr><td>${f.id}</td><td>${f.name}</td><td>${f.kind}</td><td>${f.size}</td><td>${f.modified}</td><td>${f.owner}</td><td>${f.location}</td></tr>
          `
          )}
        </tbody>
      </table>
    </div>
  `
  )
);

export const changingContent: Page = {
  title: 'Changing content',
  render(main) {
    let shown = files(1, 30);
    render(
      main,
      html`
      <div class="compare">
        ${intro('Changing content', 'The bars follow the content as it grows and shrinks.')}
        <div class="controls">
          <button type="button" data-action="add">Add 5 files</button>
          <button type="button" data-action="remove">Remove 5 files</button>
          <span class="muted" data-count></span>
        </div>
        ${sides(lib => html`<div class="box" data-files ${lib}></div>`)}
      </div>
    `
    );

    const showFiles = (): void => {
      find(main, '[data-count]').textContent = `${shown.length} files`;
      main
        .querySelectorAll<HTMLElement>('[data-files]')
        .forEach(box => render(box, html`${shown.map(f => html`<p><span class="num">${f.id}</span>${f.name}</p>`)}`));
    };
    find(main, '[data-action=add]').addEventListener('click', () => {
      shown = [...shown, ...files(shown.length + 1, 5)];
      showFiles();
    });
    find(main, '[data-action=remove]').addEventListener('click', () => {
      shown = shown.slice(0, Math.max(0, shown.length - 5));
      showFiles();
    });

    showFiles();
    const bars = new Bars();
    bars.attachMarked(main);
    return () => bars.destroy();
  }
};

const dialogRows = files(1, 30).map(f => html`<p>${f.name} <span class="muted">${f.size}</span></p>`);

export const dialog: Page = {
  title: 'Dialog',
  render(main) {
    render(
      main,
      html`
      <div class="compare">
        ${intro('Dialog', 'Bars inside a modal dialog, above the page.')}
        <button type="button" class="primary" data-action="open">Open dialog</button>
        <dialog class="dialog" aria-label="Recent files"></dialog>
      </div>
    `
    );

    const bars = new Bars();
    // A modal <dialog> is in the top layer, above everything in the page, the page's own bars included (their frames
    // have a high z-index), and makes the page behind it inert
    const dialog = find<HTMLDialogElement>(main, 'dialog');

    find(main, '[data-action=open]').addEventListener('click', () => {
      render(
        dialog,
        html`
        <h2 class="dialog-title">Recent files</h2>
        <div class="dialog-body">${sides(lib => html`<div class="box dialog-box" ${lib}>${dialogRows}</div>`)}</div>
        <div class="dialog-footer"><button type="button" class="primary" data-action="close">Done</button></div>
      `
      );
      dialog.showModal();
      bars.attachMarked(dialog);
      find(dialog, '[data-action=close]').addEventListener('click', () => dialog.close());
    });

    // However it closes: Done, a click on the backdrop, or Escape
    dialog.addEventListener('close', () => {
      bars.destroy();
      dialog.replaceChildren();
    });
    // A click on the backdrop is a click on the dialog itself, outside its box. It closes the dialog only if the press
    // started there too: dragging a text selection out of the dialog also ends in a click on it, outside its box.
    const onBackdrop = (event: MouseEvent): boolean => {
      const box = dialog.getBoundingClientRect();
      const outside =
        event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      return event.target === dialog && outside;
    };
    let pressedOnBackdrop = false;
    dialog.addEventListener('pointerdown', event => {
      pressedOnBackdrop = onBackdrop(event);
    });
    dialog.addEventListener('click', event => {
      if (pressedOnBackdrop && onBackdrop(event)) {
        dialog.close();
      }
    });

    return () => bars.destroy();
  }
};

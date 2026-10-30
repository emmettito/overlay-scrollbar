import { resolveOptions } from './resolve-options.js';

describe('resolveOptions', () => {
  it('fills in the defaults', () => {
    expect(resolveOptions({})).toEqual({
      force: false,
      autoHide: true,
      hoverDelay: 80,
      hideAfterScroll: 700,
      hideAfterLeave: 500,
      minThumbLength: 20
    });
  });

  it('keeps what was given, including false and 0', () => {
    expect(resolveOptions({ force: true, autoHide: false, hoverDelay: 0 })).toMatchObject({
      force: true,
      autoHide: false,
      hoverDelay: 0
    });
  });

  it('gives an option passed as undefined its default, as Angular inputs often do', () => {
    expect(resolveOptions({ hideAfterScroll: undefined, autoHide: undefined })).toMatchObject({
      hideAfterScroll: 700,
      autoHide: true
    });
  });
});

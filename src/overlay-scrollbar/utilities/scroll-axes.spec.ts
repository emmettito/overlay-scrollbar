import { sameAxes, scrollAxes } from './scroll-axes.js';

describe('scrollAxes', () => {
  // What Chromium, WebKit and Firefox report: which way scrollLeft and scrollTop run, and the side Chromium puts its own
  // vertical scrollbar on
  it.each([
    ['horizontal-tb', 'ltr', false, false, false],
    ['horizontal-tb', 'rtl', true, false, true],
    ['vertical-rl', 'ltr', true, false, false],
    ['vertical-rl', 'rtl', true, true, false],
    ['vertical-lr', 'ltr', false, false, false],
    ['vertical-lr', 'rtl', false, true, false],
    ['sideways-rl', 'ltr', true, false, false],
    ['sideways-rl', 'rtl', true, true, false],
    ['sideways-lr', 'ltr', false, true, false],
    ['sideways-lr', 'rtl', false, false, false]
  ])('%s %s', (writingMode, direction, reverseX, reverseY, barYLeft) => {
    expect(scrollAxes(writingMode, direction)).toEqual({ reverseX, reverseY, barYLeft });
  });

  it('counts no writing mode at all (jsdom) as horizontal', () => {
    expect(scrollAxes('', 'rtl')).toEqual({ reverseX: true, reverseY: false, barYLeft: true });
  });
});

describe('sameAxes', () => {
  it('compares every field', () => {
    const axes = scrollAxes('vertical-rl', 'rtl');
    expect(sameAxes(axes, { ...axes })).toBe(true);
    expect(sameAxes(axes, { ...axes, reverseX: false })).toBe(false);
    expect(sameAxes(axes, { ...axes, reverseY: false })).toBe(false);
    expect(sameAxes(axes, { ...axes, barYLeft: true })).toBe(false);
  });
});

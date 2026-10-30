import { measureThumb, overscroll, placeThumbOnTrack } from './thumb-geometry.js';

// Measured from Safari: a 360px-tall box with 930px of content and a 354px track
const track = 354;
const visible = 360;
const total = 930;
const maxScroll = total - visible;

describe('measureThumb', () => {
  it('sizes the thumb to the visible part of the content', () => {
    const size = measureThumb(track, visible, total);
    expect(size.length).toBeCloseTo(137.03, 2);
    expect(size.travel).toBeCloseTo(track - 137.03, 2);
  });

  it('keeps the thumb at least 20px long', () => {
    expect(measureThumb(track, visible, 100_000)).toEqual({ length: 20, travel: track - 20 });
  });

  it('takes a different minimum length', () => {
    expect(measureThumb(track, visible, 100_000, 40)).toEqual({ length: 40, travel: track - 40 });
  });

  it('fills a track shorter than the minimum length, rather than overflowing it', () => {
    expect(measureThumb(14, visible, 100_000)).toEqual({ length: 14, travel: 0 });
  });

  it('has no travel when the thumb fills the track', () => {
    expect(measureThumb(10, visible, visible + 1).travel).toBe(0);
  });
});

describe('overscroll', () => {
  it('is how far the position is past either end', () => {
    expect(overscroll(-40, maxScroll)).toBe(-40);
    expect(overscroll(maxScroll + 70, maxScroll)).toBe(70);
    expect(overscroll(100, maxScroll)).toBe(0);
  });
});

describe('placeThumbOnTrack', () => {
  const size = measureThumb(track, visible, total);

  it('moves the thumb along its travel in proportion to the scroll position', () => {
    expect(placeThumbOnTrack(0, maxScroll, 0, visible, track, size)).toEqual({ length: size.length, offset: 0 });
    expect(placeThumbOnTrack(maxScroll / 2, maxScroll, 0, visible, track, size).offset).toBeCloseTo(size.travel / 2, 5);
    expect(placeThumbOnTrack(maxScroll, maxScroll, 0, visible, track, size).offset).toBeCloseTo(size.travel, 5);
  });

  it('squashes the thumb against the end it bounces at, like Safari (70px past the end: 110px long)', () => {
    const { length, offset } = placeThumbOnTrack(maxScroll + 70, maxScroll, 70, visible, track, size);
    expect(length).toBeCloseTo(110.39, 2);
    // Its far end stays at the end of the track
    expect(offset + length).toBeCloseTo(track, 5);
  });

  it('squashes the thumb at the start when bouncing past the top, anchored there', () => {
    const { length, offset } = placeThumbOnTrack(-40, maxScroll, -40, visible, track, size);
    expect(length).toBeCloseTo((track * (visible - 40)) / total, 5);
    expect(offset).toBe(0);
  });

  it('never squashes the thumb below 20px', () => {
    expect(placeThumbOnTrack(maxScroll + 400, maxScroll, 400, visible, track, size).length).toBe(20);
    expect(placeThumbOnTrack(maxScroll + 400, maxScroll, 400, visible, track, size, 30).length).toBe(30);
  });
});

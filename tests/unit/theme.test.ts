import { describe, it, expect, beforeEach } from 'vitest';
import { relativeLuminance, effectiveBackground, themeForElement } from '../../src/content/theme';

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.backgroundColor = 'rgb(255,255,255)';
});

describe('relativeLuminance', () => {
  it('white ≈ 1, black = 0', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 2);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
  });
});

describe('effectiveBackground', () => {
  it('walks up to the first opaque ancestor background', () => {
    document.body.innerHTML =
      '<div style="background-color: rgb(20,20,20)"><span id="e">x</span></div>';
    expect(effectiveBackground(document.getElementById('e')!)).toEqual([20, 20, 20]);
  });

  it('falls back to body when surfaces are transparent', () => {
    document.body.innerHTML = '<div><span id="e">x</span></div>';
    expect(effectiveBackground(document.getElementById('e')!)).toEqual([255, 255, 255]);
  });
});

describe('themeForElement', () => {
  it('dark surface -> dark pill', () => {
    document.body.innerHTML =
      '<div style="background-color: rgb(15,18,31)"><span id="e">x</span></div>';
    expect(themeForElement(document.getElementById('e')!)).toBe('dark');
  });

  it('light surface -> light pill', () => {
    document.body.innerHTML =
      '<div style="background-color: rgb(247,248,250)"><span id="e">x</span></div>';
    expect(themeForElement(document.getElementById('e')!)).toBe('light');
  });
});

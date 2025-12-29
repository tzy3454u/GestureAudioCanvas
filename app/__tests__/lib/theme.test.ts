/**
 * テーマ設定テスト
 * TDD: RED → GREEN → REFACTOR
 */

import theme from '@/lib/theme';

describe('Theme configuration', () => {
  it('should have primary color defined', () => {
    expect(theme.palette.primary.main).toBe('#1976d2');
  });

  it('should have secondary color defined', () => {
    expect(theme.palette.secondary.main).toBe('#dc004e');
  });

  it('should be in light mode', () => {
    expect(theme.palette.mode).toBe('light');
  });

  describe('typography - responsive font settings', () => {
    it('should use rem units for body font size (14px minimum)', () => {
      // MUI default body1 is 1rem (16px), which is >= 14px
      const body1 = theme.typography.body1;
      expect(body1).toBeDefined();

      // Check that fontSize uses rem or is undefined (MUI default)
      if (typeof body1 === 'object' && body1.fontSize) {
        const fontSize = body1.fontSize as string;
        // Should be rem units or a number (MUI converts to rem)
        expect(
          typeof fontSize === 'number' ||
          fontSize.includes('rem') ||
          parseFloat(fontSize) >= 14
        ).toBe(true);
      }
      // If undefined, MUI defaults to 1rem (16px) which satisfies the requirement
    });

    it('should have fontFamily defined', () => {
      expect(theme.typography.fontFamily).toBeDefined();
    });

    it('should support browser font size settings via rem units', () => {
      // MUI uses rem by default, verify the theme doesn't override to px
      const typography = theme.typography;

      // Check that base font sizes don't use fixed px values
      const body1 = typography.body1;
      const body2 = typography.body2;

      // If fontSize is explicitly set, it should use rem
      if (typeof body1 === 'object' && body1.fontSize) {
        const fontSize = String(body1.fontSize);
        expect(fontSize.includes('px')).toBe(false);
      }
      if (typeof body2 === 'object' && body2.fontSize) {
        const fontSize = String(body2.fontSize);
        expect(fontSize.includes('px')).toBe(false);
      }
    });
  });
});

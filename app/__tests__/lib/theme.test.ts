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
});

/**
 * @jest-environment node
 */

import { viewport } from '@/app/layout';

describe('layout.tsx', () => {
  describe('viewport export', () => {
    it('should export viewport with width=device-width', () => {
      expect(viewport).toBeDefined();
      expect(viewport.width).toBe('device-width');
    });

    it('should export viewport with initialScale=1.0', () => {
      expect(viewport.initialScale).toBe(1);
    });
  });
});

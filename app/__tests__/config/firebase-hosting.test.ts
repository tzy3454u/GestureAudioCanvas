import * as fs from 'fs';
import * as path from 'path';

describe('Firebase Hosting Configuration', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const firebaseJsonPath = path.join(projectRoot, 'firebase.json');
  const firebasercPath = path.join(projectRoot, '.firebaserc');

  describe('firebase.json', () => {
    let firebaseConfig: Record<string, unknown>;

    beforeAll(() => {
      const content = fs.readFileSync(firebaseJsonPath, 'utf-8');
      firebaseConfig = JSON.parse(content);
    });

    it('should exist', () => {
      expect(fs.existsSync(firebaseJsonPath)).toBe(true);
    });

    it('should have hosting configuration', () => {
      expect(firebaseConfig).toHaveProperty('hosting');
    });

    it('should specify correct public directory for Next.js static export', () => {
      const hosting = firebaseConfig.hosting as Record<string, unknown>;
      expect(hosting.public).toBe('app/out');
    });

    it('should ignore Firebase-specific files', () => {
      const hosting = firebaseConfig.hosting as Record<string, unknown>;
      const ignore = hosting.ignore as string[];
      expect(ignore).toContain('firebase.json');
      expect(ignore).toContain('**/.*');
      expect(ignore).toContain('**/node_modules/**');
    });

    it('should have SPA rewrite configuration for client-side routing', () => {
      const hosting = firebaseConfig.hosting as Record<string, unknown>;
      const rewrites = hosting.rewrites as Array<{ source: string; destination: string }>;
      expect(rewrites).toBeDefined();
      expect(rewrites).toContainEqual({
        source: '**',
        destination: '/index.html',
      });
    });

    it('should have correct headers for security and caching', () => {
      const hosting = firebaseConfig.hosting as Record<string, unknown>;
      const headers = hosting.headers as Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      expect(headers).toBeDefined();

      // Check for cache control on static assets
      const staticAssetsHeader = headers.find(h => h.source.includes('**/*.@('));
      expect(staticAssetsHeader).toBeDefined();
    });
  });

  describe('.firebaserc', () => {
    let firebaserc: Record<string, unknown>;

    beforeAll(() => {
      const content = fs.readFileSync(firebasercPath, 'utf-8');
      firebaserc = JSON.parse(content);
    });

    it('should exist', () => {
      expect(fs.existsSync(firebasercPath)).toBe(true);
    });

    it('should have projects configuration', () => {
      expect(firebaserc).toHaveProperty('projects');
    });

    it('should have default project placeholder', () => {
      const projects = firebaserc.projects as Record<string, string>;
      expect(projects).toHaveProperty('default');
    });
  });

  describe('Next.js static export compatibility', () => {
    const nextConfigPath = path.join(projectRoot, 'app/next.config.js');

    it('should have Next.js configured for static export', () => {
      const content = fs.readFileSync(nextConfigPath, 'utf-8');
      expect(content).toContain("output: 'export'");
    });

    it('should have trailingSlash enabled for Firebase Hosting compatibility', () => {
      const content = fs.readFileSync(nextConfigPath, 'utf-8');
      expect(content).toContain('trailingSlash: true');
    });
  });
});

/**
 * Firebase初期化テスト
 * TDD: RED → GREEN → REFACTOR
 */

// Firebase SDKをモック
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
}));

describe('Firebase initialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export firebase module without errors', () => {
    // Firebase設定がexportされていることを確認
    expect(() => require('@/lib/firebase')).not.toThrow();
  });

  it('should call initializeApp when no apps exist', () => {
    const { initializeApp, getApps } = require('firebase/app');
    getApps.mockReturnValue([]);

    jest.isolateModules(() => {
      require('@/lib/firebase');
    });

    expect(initializeApp).toHaveBeenCalled();
  });
});

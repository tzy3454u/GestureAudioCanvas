import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { ReactNode } from 'react';

// Firebase auth モック
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

const mockedSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.Mock;
const mockedSignOut = firebaseSignOut as jest.Mock;
const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock;

// Wrapper for hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });
  });

  describe('signIn', () => {
    it('正しいメールアドレスとパスワードでログインが成功する', async () => {
      mockedSignInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockedSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'test@example.com',
        'password123'
      );
      expect(result.current.error).toBeNull();
    });

    it('不正な認証情報でログインが失敗するとエラーが設定される', async () => {
      mockedSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(result.current.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('無効なメールアドレスでエラーメッセージが表示される', async () => {
      mockedSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'Invalid email',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('invalid-email', 'password123');
      });

      expect(result.current.error).toBe('有効なメールアドレスを入力してください');
    });

    it('ユーザーが存在しない場合のエラーメッセージ', async () => {
      mockedSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('notfound@example.com', 'password123');
      });

      expect(result.current.error).toBe('メールアドレスまたはパスワードが正しくありません');
    });

    it('ネットワークエラー時のエラーメッセージ', async () => {
      mockedSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'Network error',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('ネットワークエラーが発生しました。再試行してください');
    });
  });

  describe('signOut', () => {
    it('ログアウトが正常に実行される', async () => {
      mockedSignOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockedSignOut).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('ログアウト失敗時にエラーが設定される', async () => {
      mockedSignOut.mockRejectedValue(new Error('Sign out failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBe('ログアウトに失敗しました');
    });
  });

  describe('clearError', () => {
    it('エラー状態がクリアされる', async () => {
      mockedSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

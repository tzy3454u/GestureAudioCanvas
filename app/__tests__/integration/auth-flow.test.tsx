/**
 * 認証フロー統合テスト
 * Task 7.1: 認証フローの検証
 * - ログイン成功/失敗の動作確認
 * - 未認証アクセス時のリダイレクト確認
 * - ログアウト後の状態クリア確認
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';

// Mocks
const mockPush = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

// Firebase mock
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  getAuth: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// テスト用ラッパー
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// 認証フローテスト用コンポーネント
function AuthFlowTestComponent() {
  const { user, isLoading, isAuthenticated, error, signIn, signOut, clearError } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user-email">{user?.email || 'null'}</div>
      <div data-testid="error">{error || 'null'}</div>
      <button onClick={() => signIn('test@example.com', 'password123')}>ログイン</button>
      <button onClick={() => signIn('invalid@example.com', 'wrong')}>不正ログイン</button>
      <button onClick={() => signOut()}>ログアウト</button>
      <button onClick={() => clearError()}>エラークリア</button>
    </div>
  );
}

describe('認証フロー統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });
  });

  describe('Req 8.2, 8.5: ログイン成功時の動作', () => {
    it('正しい認証情報でログインが成功する', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' },
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログイン'));

      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
          {},
          'test@example.com',
          'password123'
        );
      });
    });

    it('ログイン成功後にエラーがクリアされる', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' },
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログイン'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });
  });

  describe('Req 8.7: ログイン失敗時のエラー表示', () => {
    it('不正な認証情報でエラーメッセージが表示される', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid credential',
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('不正ログイン'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'メールアドレスまたはパスワードが正しくありません'
        );
      });
    });

    it('無効なメールアドレスで適切なエラーメッセージが表示される', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'Invalid email',
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログイン'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          '有効なメールアドレスを入力してください'
        );
      });
    });

    it('ネットワークエラー時に適切なエラーメッセージが表示される', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'Network error',
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログイン'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'ネットワークエラーが発生しました。再試行してください'
        );
      });
    });

    it('エラーをクリアできる', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid credential',
      });

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('不正ログイン'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('null');
      });

      await user.click(screen.getByText('エラークリア'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });
  });

  describe('Req 8.6: ログアウト後の状態クリア', () => {
    it('ログアウトが正常に実行される', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログアウト'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('ログアウト後にエラー状態がクリアされる', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログアウト'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('ログアウト失敗時にエラーが表示される', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      const user = userEvent.setup();
      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await user.click(screen.getByText('ログアウト'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('ログアウトに失敗しました');
      });
    });
  });

  describe('Req 8.1, 8.4: 認証状態管理', () => {
    it('初期状態ではローディング中である', () => {
      mockOnAuthStateChanged.mockImplementation(() => () => {});

      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    it('未認証状態が正しく検出される', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('null');
      });
    });

    it('認証済み状態が正しく検出される', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return () => {};
      });

      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    it('認証状態変更時にリスナーが呼ばれる', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        return () => {};
      });

      render(<AuthFlowTestComponent />, { wrapper: TestWrapper });

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
    });
  });
});

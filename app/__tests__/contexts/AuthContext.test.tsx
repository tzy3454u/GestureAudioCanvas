import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';

// Firebase auth モック
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {},
}));

const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock;

// テスト用コンポーネント
function TestConsumer() {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  return (
    <div>
      <span data-testid="loading">{isLoading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="user-email">{user?.email ?? 'null'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態ではローディング中である', () => {
    mockedOnAuthStateChanged.mockImplementation(() => () => {});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('未認証ユーザーの場合、isAuthenticatedがfalseになる', async () => {
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-email')).toHaveTextContent('null');
  });

  it('認証済みユーザーの場合、isAuthenticatedがtrueになる', async () => {
    const mockUser: Partial<FirebaseUser> = {
      uid: 'test-uid',
      email: 'test@example.com',
    };

    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
  });

  it('コンポーネントがアンマウントされるとリスナーが解除される', () => {
    const unsubscribe = jest.fn();
    mockedOnAuthStateChanged.mockImplementation(() => unsubscribe);

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('AuthProviderの外でuseAuthContextを使用するとエラーになる', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuthContext must be used within an AuthProvider'
    );

    consoleError.mockRestore();
  });
});

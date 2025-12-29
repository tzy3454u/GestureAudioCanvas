import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks - must be hoisted
const mockSignIn = jest.fn();
const mockClearError = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

import LoginPage from '@/app/login/page';
import { useAuth } from '@/hooks/useAuth';

const mockedUseAuth = useAuth as jest.Mock;

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      signIn: mockSignIn,
      signOut: jest.fn(),
      clearError: mockClearError,
    });
  });

  it('ログインフォームが表示される', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument();
  });

  it('メールアドレスとパスワードを入力できる', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const passwordInput = screen.getByLabelText(/パスワード/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('ログインボタンをクリックするとsignInが呼ばれる', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/メールアドレス/i), 'test@example.com');
    await user.type(screen.getByLabelText(/パスワード/i), 'password123');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('送信中はボタンが無効化される', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/メールアドレス/i), 'test@example.com');
    await user.type(screen.getByLabelText(/パスワード/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /ログイン/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('エラーメッセージが表示される', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: 'メールアドレスまたはパスワードが正しくありません',
      signIn: mockSignIn,
      signOut: jest.fn(),
      clearError: mockClearError,
    });

    render(<LoginPage />);

    expect(
      screen.getByText('メールアドレスまたはパスワードが正しくありません')
    ).toBeInTheDocument();
  });

  it('認証済みの場合はメイン画面にリダイレクトされる', async () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
      error: null,
      signIn: mockSignIn,
      signOut: jest.fn(),
      clearError: mockClearError,
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('メールアドレスが空の場合は送信されない', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/パスワード/i), 'password123');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('パスワードが空の場合は送信されない', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/メールアドレス/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /ログイン/i }));

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('ローディング中はスピナーが表示される', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      signIn: mockSignIn,
      signOut: jest.fn(),
      clearError: mockClearError,
    });

    render(<LoginPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

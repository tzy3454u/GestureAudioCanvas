import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';

const mockedUseAuth = useAuth as jest.Mock;

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { uid: 'test-uid', email: 'test@example.com' },
      isLoading: false,
      isAuthenticated: true,
      signOut: mockSignOut,
    });
  });

  it('アプリケーション名が表示される', () => {
    render(<Header />);

    expect(screen.getByText('Gesture Audio Canvas')).toBeInTheDocument();
  });

  it('ユーザーのメールアドレスが表示される', () => {
    render(<Header />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('ログアウトボタンが表示される', () => {
    render(<Header />);

    expect(screen.getByRole('button', { name: /ログアウト/i })).toBeInTheDocument();
  });

  it('ログアウトボタンをクリックするとsignOutが呼ばれる', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue(undefined);

    render(<Header />);

    await user.click(screen.getByRole('button', { name: /ログアウト/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('ログアウト成功後にログイン画面にリダイレクトされる', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue(undefined);

    render(<Header />);

    await user.click(screen.getByRole('button', { name: /ログアウト/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('ユーザー情報がない場合はメールアドレスが表示されない', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signOut: mockSignOut,
    });

    render(<Header />);

    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });
});

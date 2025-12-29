import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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

// MUIテーマをラップするヘルパー
const renderWithTheme = (component: React.ReactNode) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

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

    // モバイル用とデスクトップ用の両方が存在する
    const logoutButtons = screen.getAllByRole('button', { name: /ログアウト/i });
    expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('ログアウトボタンをクリックするとsignOutが呼ばれる', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue(undefined);

    render(<Header />);

    // いずれかのログアウトボタンをクリック
    const logoutButtons = screen.getAllByRole('button', { name: /ログアウト/i });
    await user.click(logoutButtons[0]);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('ログアウト成功後にログイン画面にリダイレクトされる', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue(undefined);

    render(<Header />);

    // いずれかのログアウトボタンをクリック
    const logoutButtons = screen.getAllByRole('button', { name: /ログアウト/i });
    await user.click(logoutButtons[0]);

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

  describe('レスポンシブ対応', () => {
    it('モバイル用の短縮タイトル「GAC」が存在する', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('GAC')).toBeInTheDocument();
    });

    it('デスクトップ用のフルタイトル「Gesture Audio Canvas」が存在する', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('Gesture Audio Canvas')).toBeInTheDocument();
    });

    it('モバイル用のアイコンのみログアウトボタンが存在する', () => {
      renderWithTheme(<Header />);

      // IconButtonはaria-labelでログアウトを識別
      expect(screen.getByLabelText('ログアウト')).toBeInTheDocument();
    });

    it('デスクトップ用のテキスト付きログアウトボタンが存在する', () => {
      renderWithTheme(<Header />);

      // テキスト「ログアウト」を含むボタンが存在することを確認
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    it('ログアウトボタン（IconButton）のタップ領域は最低44x44px確保される', () => {
      renderWithTheme(<Header />);

      const iconButton = screen.getByLabelText('ログアウト');
      // IconButtonにminWidth/minHeightのスタイルが適用されていることを確認
      expect(iconButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });
  });
});

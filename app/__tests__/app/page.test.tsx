/**
 * ホームページコンポーネントテスト
 * ルートページは認証状態に応じてリダイレクトを行う
 */

import { render, screen, waitFor } from '@testing-library/react';

// Mocks - must be hoisted
const mockPush = jest.fn();
const mockUseAuth = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  clearError: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

import Home from '@/app/page';

describe('Home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.isLoading = false;
    mockUseAuth.isAuthenticated = false;
  });

  it('ローディング中はスピナーが表示される', () => {
    mockUseAuth.isLoading = true;

    render(<Home />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('未認証の場合はログインページにリダイレクトされる', async () => {
    mockUseAuth.isLoading = false;
    mockUseAuth.isAuthenticated = false;

    render(<Home />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('認証済みの場合はメインページにリダイレクトされる', async () => {
    mockUseAuth.isLoading = false;
    mockUseAuth.isAuthenticated = true;

    render(<Home />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/main');
    });
  });
});

/**
 * ホームページコンポーネントテスト
 * TDD: RED → GREEN → REFACTOR
 */

import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// MUIのテーマプロバイダをモック
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
}));

describe('Home page', () => {
  it('should render the title', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Gesture Audio Canvas'
    );
  });

  it('should render the description', () => {
    render(<Home />);
    expect(
      screen.getByText('ジェスチャーで音声を操作するWebアプリケーション')
    ).toBeInTheDocument();
  });
});

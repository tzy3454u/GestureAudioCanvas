import type { Metadata, Viewport } from 'next';
import ThemeRegistry from '@/lib/ThemeRegistry';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Gesture Audio Canvas',
  description: 'ジェスチャーで音声を操作するWebアプリケーション',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  );
}

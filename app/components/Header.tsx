'use client';

import { useRouter } from 'next/navigation';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* モバイル用短縮タイトル */}
        <Typography
          variant="h6"
          component="div"
          sx={{ display: { xs: 'block', sm: 'none' }, flexGrow: 1 }}
        >
          GAC
        </Typography>
        {/* デスクトップ用フルタイトル */}
        <Typography
          variant="h6"
          component="div"
          sx={{ display: { xs: 'none', sm: 'block' }, flexGrow: 1 }}
        >
          Gesture Audio Canvas
        </Typography>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* メールアドレスはデスクトップのみ表示 */}
            <Typography
              variant="body2"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {user.email}
            </Typography>
            {/* モバイル用: アイコンのみログアウトボタン */}
            <IconButton
              color="inherit"
              onClick={handleLogout}
              aria-label="ログアウト"
              sx={{
                display: { xs: 'flex', sm: 'none' },
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <LogoutIcon />
            </IconButton>
            {/* デスクトップ用: テキスト付きログアウトボタン */}
            <Button
              color="inherit"
              onClick={handleLogout}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                minHeight: 44,
              }}
            >
              ログアウト
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

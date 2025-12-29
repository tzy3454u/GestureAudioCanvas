'use client';

import { Container, Typography, Box } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Gesture Audio Canvas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ジェスチャーで音声を操作するWebアプリケーション
        </Typography>
      </Box>
    </Container>
  );
}

'use client';

import { useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthContext, User } from '@/contexts/AuthContext';

export interface AuthHook {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return '有効なメールアドレスを入力してください';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました。再試行してください';
    case 'auth/too-many-requests':
      return 'アクセスが一時的に制限されています。しばらく待ってから再試行してください';
    default:
      return 'ログインに失敗しました';
  }
}

export function useAuth(): AuthHook {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const errorMessage = getErrorMessage(firebaseError.code || '');
      setError(errorMessage);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      setError('ログアウトに失敗しました');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    signIn,
    signOut,
    clearError,
  };
}

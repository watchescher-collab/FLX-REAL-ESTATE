import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { AuthUser } from '../types';
import { fetchSessionUser, registerUser, signIn as apiSignIn, signOut as apiSignOut, updateProfile as apiUpdateProfile } from '../auth';

interface LoginResult {
  success: boolean;
  message: string;
  role?: AuthUser['role'];
  pendingApproval?: boolean;
}

interface SignInInput {
  email: string;
  password: string;
}

interface RegisterInput extends SignInInput {
  name: string;
  role: AuthUser['role'];
  clientCategory?: string;
}

interface ProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  picture?: string;
}

interface ProfileUpdateResult {
  success: boolean;
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (input: SignInInput) => Promise<LoginResult>;
  signUp: (input: RegisterInput) => Promise<LoginResult>;
  signInWithEmail: (input: SignInInput) => Promise<LoginResult>;
  registerAccount: (input: RegisterInput) => Promise<LoginResult>;
  updateProfile: (input: ProfileUpdateInput) => Promise<ProfileUpdateResult>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAuthUser = (user: { id: number; name: string; email: string; role: string; phone?: string; profile_picture?: string; client_category?: string }): AuthUser => ({
  id: String(user.id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  picture: user.profile_picture,
  clientCategory: user.client_category,
  role: user.role as AuthUser['role'],
  isVerified: true,
  provider: 'local',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void fetchSessionUser()
      .then((sessionUser) => {
        if (isCurrent) setUser(sessionUser ? toAuthUser(sessionUser) : null);
      })
      .catch(() => {
        if (isCurrent) setUser(null);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const signInWithEmail = useCallback(async ({ email, password }: SignInInput): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const nextUser = toAuthUser(await apiSignIn(email.trim(), password));
      setUser(nextUser);
      setIsAuthModalOpen(false);
      return { success: true, message: 'Signed in successfully.', role: nextUser.role };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to sign in. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerAccount = useCallback(async ({ name, email, password, role, clientCategory }: RegisterInput): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const account = await registerUser(name.trim(), email.trim(), password, role || 'Client', clientCategory || '');
      if (account.pending_approval) {
        return { success: true, pendingApproval: true, message: account.message || 'Your account is awaiting FLX approval.', role: account.role as AuthUser['role'] };
      }
      const nextUser = toAuthUser(account);
      setUser(nextUser);
      setIsAuthModalOpen(false);
      return { success: true, message: 'Account created successfully.', role: nextUser.role };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to create account. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    apiSignOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: ProfileUpdateInput): Promise<ProfileUpdateResult> => {
    if (!user) return { success: false, message: 'Sign in to edit your profile.' };
    try {
      setUser(toAuthUser(await apiUpdateProfile(input)));
      return { success: true, message: 'Your profile has been updated.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Your profile could not be saved. Please try again.' };
    }
  }, [user]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    signIn: signInWithEmail,
    signUp: registerAccount,
    signInWithEmail,
    registerAccount,
    updateProfile,
    signOut,
  }), [user, isLoading, isAuthModalOpen, openAuthModal, closeAuthModal, signInWithEmail, registerAccount, updateProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

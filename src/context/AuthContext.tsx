import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  logout as authLogout,
  subscribeToPartnerProfile,
  updatePartnerProfile,
  resubmitApplication,
} from '../services/authService';
import { type MarketPartnerProfile, type PartnerApplicationStatus } from '../types';

interface AuthContextType {
  currentUser: User | null;
  partnerProfile: MarketPartnerProfile | null;
  loading: boolean;
  authError: string | null;
  status: PartnerApplicationStatus | null;
  isApproved: boolean;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<MarketPartnerProfile>) => Promise<void>;
  resubmit: (updates: Partial<MarketPartnerProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<MarketPartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        if (user) {
          // Listen to partner profile doc in real time
          unsubscribeProfile = subscribeToPartnerProfile(
            user.uid,
            (profile) => {
              setPartnerProfile(profile);
              setLoading(false);
              setAuthError(null);
            },
            (err) => {
              console.error('Partner profile subscription error:', err);
              setAuthError(err.message);
              setLoading(false);
            }
          );
        } else {
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
          setPartnerProfile(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setAuthError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
      setPartnerProfile(null);
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  const handleUpdateProfile = async (updates: Partial<MarketPartnerProfile>) => {
    if (!currentUser) throw new Error('Not authenticated');
    await updatePartnerProfile(currentUser.uid, updates);
  };

  const handleResubmit = async (updates: Partial<MarketPartnerProfile>) => {
    if (!currentUser) throw new Error('Not authenticated');
    await resubmitApplication(currentUser.uid, updates);
  };

  const status = partnerProfile?.status || null;
  const isApproved = status === 'APPROVED';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        partnerProfile,
        loading,
        authError,
        status,
        isApproved,
        logout: handleLogout,
        updateProfile: handleUpdateProfile,
        resubmit: handleResubmit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

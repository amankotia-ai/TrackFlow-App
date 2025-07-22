import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, ApiResponse } from '../lib/apiClient';
import { supabase } from '../lib/supabase'; // Keep for auth state listening only

interface User {
  id: string;
  email: string;
  user_metadata?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, options?: { data?: { full_name?: string } }) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Simple, reliable AuthProvider using the new ApiClient
 * Handles all authentication through ApiClient with proper error handling
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Initializing auth context...');
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const response: ApiResponse = await apiClient.getCurrentSession();
        
        if (response.success && response.data?.user) {
          setUser(response.data.user);
          console.log('✅ User authenticated:', response.data.user.email);
        } else {
          setUser(null);
          console.log('ℹ️ No authenticated user');
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes using Supabase (since it handles this well)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`);
        
                 if (session?.user && session.user.email) {
           setUser({
             id: session.user.id,
             email: session.user.email,
             user_metadata: session.user.user_metadata
           });
           console.log('✅ User signed in:', session.user.email);
          
          // Create user profile if signing in for the first time
          if (event === 'SIGNED_IN') {
            try {
              // We could call an API to create/update user profile here if needed
              console.log('User signed in successfully');
            } catch (error) {
              console.warn('Profile creation/update failed:', error);
              // Non-critical error, don't fail the sign-in
            }
          }
        } else {
          setUser(null);
          console.log('ℹ️ User signed out');
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log(`🔐 Signing in user: ${email}...`);
    setLoading(true);
    
    try {
      const response: ApiResponse = await apiClient.signIn(email, password);
      
      if (!response.success) {
        console.error('Sign in failed:', response.error);
        return { error: response.error || 'Sign in failed' };
      }
      
      console.log('✅ Sign in successful');
      return { error: null };
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error: error.message || 'An unexpected error occurred during sign in' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    options?: { data?: { full_name?: string } }
  ) => {
    console.log(`🔐 Signing up user: ${email}...`);
    setLoading(true);
    
    try {
      const response: ApiResponse = await apiClient.signUp(email, password, options?.data);
      
      if (!response.success) {
        console.error('Sign up failed:', response.error);
        return { error: response.error || 'Sign up failed' };
      }
      
      console.log('✅ Sign up successful');
      return { error: null };
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error: error.message || 'An unexpected error occurred during sign up' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🔐 Signing out user...');
    setLoading(true);
    
    try {
      const response: ApiResponse = await apiClient.signOut();
      
      if (!response.success) {
        console.error('Sign out failed:', response.error);
        return { error: response.error || 'Sign out failed' };
      }
      
      console.log('✅ Sign out successful');
      return { error: null };
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error: error.message || 'An unexpected error occurred during sign out' };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    console.log(`🔐 Resetting password for: ${email}...`);
    
    try {
      // Use Supabase directly for password reset since it's a simple operation
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('Password reset failed:', error);
        return { error: error.message };
      }
      
      console.log('✅ Password reset email sent');
      return { error: null };
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { error: error.message || 'An unexpected error occurred during password reset' };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
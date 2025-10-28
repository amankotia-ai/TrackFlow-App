import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

// Session cache to prevent excessive API calls
let sessionCache: { user: User | null; timestamp: number } | null = null;
const SESSION_CACHE_DURATION = 5000; // 5 seconds

/**
 * Enhanced, reliable AuthProvider with session recovery and error handling
 * Prevents false logouts and handles transient failures gracefully
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const retryAttemptRef = useRef(0);
  const maxRetries = 3;
  const authStateRef = useRef<'initializing' | 'authenticated' | 'unauthenticated'>('initializing');

  // Helper function to validate session with retry logic
  const validateSession = async (retryCount = 0): Promise<User | null> => {
    try {
      // Check cache first
      if (sessionCache && Date.now() - sessionCache.timestamp < SESSION_CACHE_DURATION) {
        console.log('🔐 Using cached session');
        return sessionCache.user;
      }

      const response: ApiResponse = await apiClient.getCurrentSession();
      
      if (response.success && response.data?.user) {
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          user_metadata: response.data.user.user_metadata
        };
        
        // Update cache
        sessionCache = { user: userData, timestamp: Date.now() };
        return userData;
      }
      
      return null;
    } catch (error: any) {
      console.error(`Session validation error (attempt ${retryCount + 1}):`, error);
      
      // Retry with exponential backoff for network errors
      if (retryCount < maxRetries && (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR')) {
        const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`🔄 Retrying session validation in ${backoffDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return validateSession(retryCount + 1);
      }
      
      // Don't log out on transient errors - keep current state
      if (authStateRef.current === 'authenticated') {
        console.warn('⚠️ Session validation failed but keeping user authenticated (transient error)');
        return user; // Return current user to prevent false logout
      }
      
      return null;
    }
  };

  useEffect(() => {
    console.log('🔐 Initializing enhanced auth context...');
    
    // Get initial session with retry logic
    const initializeAuth = async () => {
      try {
        const validatedUser = await validateSession();
        
        if (validatedUser) {
          setUser(validatedUser);
          authStateRef.current = 'authenticated';
          console.log('✅ User authenticated:', validatedUser.email);
        } else {
          setUser(null);
          authStateRef.current = 'unauthenticated';
          console.log('ℹ️ No authenticated user');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        authStateRef.current = 'unauthenticated';
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`);
        
        // Handle explicit sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          authStateRef.current = 'unauthenticated';
          sessionCache = null; // Clear cache
          console.log('ℹ️ User signed out');
          setLoading(false);
          return;
        }
        
        // Handle sign in
        if (event === 'SIGNED_IN' && session?.user && session.user.email) {
          const userData = {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata
          };
          
          setUser(userData);
          authStateRef.current = 'authenticated';
          sessionCache = { user: userData, timestamp: Date.now() };
          console.log('✅ User signed in:', session.user.email);
          setLoading(false);
          return;
        }
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed successfully');
          const userData = {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata
          };
          setUser(userData);
          sessionCache = { user: userData, timestamp: Date.now() };
          return;
        }
        
        // Handle session validation failures with recovery attempt
        if (!session && authStateRef.current === 'authenticated') {
          console.warn('⚠️ Session lost - attempting recovery...');
          
          // Try to recover session
          const recoveredUser = await validateSession();
          
          if (recoveredUser) {
            console.log('✅ Session recovered successfully');
            setUser(recoveredUser);
            authStateRef.current = 'authenticated';
          } else {
            console.error('❌ Session recovery failed - logging out');
            setUser(null);
            authStateRef.current = 'unauthenticated';
            sessionCache = null;
          }
          
          setLoading(false);
        }
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
        
        // Provide user-friendly error messages
        let errorMessage = response.error || 'Sign in failed';
        
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.';
        } else if (errorMessage.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        }
        
        return { error: errorMessage };
      }
      
      // Update auth state immediately
      authStateRef.current = 'authenticated';
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
        
        // Provide user-friendly error messages
        let errorMessage = response.error || 'Sign up failed';
        
        if (errorMessage.includes('already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        
        return { error: errorMessage };
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
      
      // Clear cache and update state regardless of API response
      sessionCache = null;
      authStateRef.current = 'unauthenticated';
      setUser(null);
      
      if (!response.success) {
        console.error('Sign out failed:', response.error);
        // Still consider it successful since we cleared local state
        return { error: null };
      }
      
      console.log('✅ Sign out successful');
      return { error: null };
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Even on error, we've cleared local state
      return { error: null };
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
import React, { useState, useEffect, useContext, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    // MEMORY LEAK FIX: Create a proper auth state change handler
    const authStateChangeHandler = async (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session?.user?.id);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          break;
          
        case 'SIGNED_OUT':
          console.log('User signed out, clearing state');
          setSession(null);
          setUser(null);
          setLoading(false);
          break;
          
        case 'TOKEN_REFRESHED':
          if (session) {
            setSession(session);
            setUser(session.user);
          } else {
            console.log('Token refresh failed, clearing session');
            setSession(null);
            setUser(null);
          }
          setLoading(false);
          break;
          
        default:
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
      }
    };
    
    // Set up auth state listener FIRST
    const { data } = supabase.auth.onAuthStateChange(authStateChangeHandler);
    subscription = data.subscription;

    // THEN check for existing session with proper error handling
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session check error:', error.message);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out user');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Clear local state regardless of API result
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Graceful fallback to prevent runtime crashes if provider isn't mounted yet
    if (import.meta.env.DEV) {
      console.warn('useAuth called outside of AuthProvider. Falling back to default context.');
    }
    return {
      user: null,
      session: null,
      loading: false,
      signOut: async () => {},
    } as AuthContextType;
  }
  return context;
};
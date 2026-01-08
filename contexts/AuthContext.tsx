import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/database';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  stripe_account_id: string | null;
  stripe_customer_id: string | null;
  language: string;
  tax_id: string | null;
  preferred_maps_app: string | null;
  use_device_language: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  isFarrier: boolean;
  isOwner: boolean;
  isStable: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      console.log('[AuthContext] Loading profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error loading profile:', error);
        throw error;
      }

      console.log('[AuthContext] Profile loaded:', data);
      setProfile(data);
    } catch (error) {
      console.error('[AuthContext] Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) {
    try {
      console.log('[AuthContext] Starting signup for:', email, 'with role:', role);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            country: 'IT',
            language: 'en',
          },
        },
      });

      if (authError) {
        console.error('[AuthContext] Signup error:', authError);
        return { error: authError };
      }
      if (!authData.user) {
        console.error('[AuthContext] No user returned from signup');
        return { error: new Error('No user returned') };
      }

      console.log('[AuthContext] User created:', authData.user.id);

      // Wait for the trigger to potentially create the profile
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      // If no profile exists, create it manually
      if (!existingProfile) {
        console.log('[AuthContext] No profile found, creating manually');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: role,
            country: 'IT',
            language: 'en',
            use_device_language: true,
          });

        if (profileError) {
          console.error('[AuthContext] Profile creation error:', profileError);
          return { error: profileError };
        }
        console.log('[AuthContext] Profile created manually');
      } else {
        console.log('[AuthContext] Profile already exists from trigger');
      }

      await loadProfile(authData.user.id);

      console.log('[AuthContext] Signup completed successfully');
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Signup exception:', error);
      return { error };
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id);
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    isFarrier: profile?.role === 'farrier',
    isOwner: profile?.role === 'owner',
    isStable: profile?.role === 'stable',
    isAdmin: profile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

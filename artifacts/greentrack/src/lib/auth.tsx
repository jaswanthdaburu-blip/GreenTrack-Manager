import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useCreateSession, useDeleteSession } from '@workspace/api-client-react';
import { supabase, supabaseConfigured } from './supabase';

type Profile = { organizationId: string; role: 'ADMIN' | 'STAFF'; fullName: string };
type AuthValue = { session: Session | null; loading: boolean; configured: boolean; profile: Profile | null; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ session: null, loading: true, configured: false, profile: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const loadProfile = async (userId: string) => {
      const { data } = await supabase!.from('profiles').select('organization_id,role,full_name').eq('id', userId).maybeSingle();
      if (!active) return;
      setProfile(data ? {
        organizationId: data.organization_id,
        role: data.role === 'STAFF' ? 'STAFF' : 'ADMIN',
        fullName: data.full_name ?? '',
      } : null);
    };
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.access_token) {
        try {
          await createSession.mutateAsync({ data: { accessToken: data.session.access_token } });
          await loadProfile(data.session.user.id);
        } catch { /* Protected API requests will report an unavailable session. */ }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT' || !next) {
        setProfile(null);
        void deleteSession.mutateAsync().catch(() => {});
        setLoading(false);
        return;
      }
      if (next?.access_token && ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION', 'USER_UPDATED'].includes(event)) {
        queueMicrotask(() => {
          void (async () => {
            try {
              await createSession.mutateAsync({ data: { accessToken: next.access_token } });
              await loadProfile(next.user.id);
            } catch {
              if (active) setProfile(null);
            } finally {
              if (active) setLoading(false);
            }
          })();
        });
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session, loading, configured: supabaseConfigured, profile,
    signOut: async () => {
      try { await deleteSession.mutateAsync(); } finally { await supabase?.auth.signOut(); setSession(null); }
    },
  }), [session, loading, profile, deleteSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

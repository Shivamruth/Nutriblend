import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabase/Client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch role from profiles table given a user object
  const fetchRole = useCallback(async (user) => {
    if (!user) {
      setAuthUser(null);
      setRole(null);
      return;
    }

    setAuthUser(user);

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Role fetch error:", error.message);
      }
      setRole(profile?.role || "customer");
    } catch (error) {
      console.error("AuthContext role fetch error:", error);
      setRole("customer");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }

      // TOKEN_REFRESHED doesn't need a role re-fetch
      if (event === "TOKEN_REFRESHED") {
        if (session?.user) setAuthUser(session.user);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN
      if (session?.user) {
        await fetchRole(session.user);
      } else {
        setAuthUser(null);
        setRole(null);
      }
      if (mounted) setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        role,
        authLoading,
        refreshUser: () => fetchRole(authUser),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
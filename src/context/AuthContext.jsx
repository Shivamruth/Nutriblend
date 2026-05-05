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

  const getUser = useCallback(async () => {
    try {
      setAuthLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        setAuthUser(null);
        setRole(null);
        return;
      }

      const user = data.user;
      setAuthUser(user);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Role fetch error:", profileError.message);
        setRole(null);
        return;
      }

      setRole(profile?.role || "customer");
    } catch (error) {
      console.error("AuthContext getUser error:", error);
      setAuthUser(null);
      setRole(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getUser]);

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        role,
        authLoading,
        refreshUser: getUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
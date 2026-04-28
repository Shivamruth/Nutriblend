import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/Client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    getUser();

    supabase.auth.onAuthStateChange(() => {
      getUser();
    });
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(profile?.role);
    } else {
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
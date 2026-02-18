import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: {
    user_id: any;
    user_id: any; full_name: string; phone: string | null; address: string | null 
} | null;
  kycStatus: "pending" | "approved" | "rejected" | "none";
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  kycStatus: "none",
  isAdmin: false,
  isLoading: true,
  signOut: async () => { },
  refreshAuth: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [kycStatus, setKycStatus] = useState<AuthContextType["kycStatus"]>("none");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const checkKyc = async (userId: string) => {
    const { data } = await supabase
      .from("kyc_submissions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    setKycStatus(data?.status ?? "none");
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const refreshAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await Promise.all([
        fetchProfile(session.user.id),
        checkAdmin(session.user.id),
        checkKyc(session.user.id)
      ]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
        checkKyc(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setKycStatus("none");
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdmin(session.user.id);
        checkKyc(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, kycStatus, isAdmin, isLoading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

import { useGetMe, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import type { LoginBody, RegisterBody } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AuthContext } from "@/hooks/auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      queryKey: ["me"],
      retry: false,
      staleTime: Infinity,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const roleHome: Record<string, string> = {
    locum: "/locum/dashboard",
    clinic_admin: "/clinic/dashboard",
    clinic_hr: "/clinic/dashboard",
    clinic_scheduler: "/clinic/dashboard",
    platform_admin: "/admin/dashboard",
  };

  async function checkProfileComplete(role: string, token: string): Promise<boolean> {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    if (role === "locum") {
      const res = await fetch(`${base}/api/locums/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    }
    if (role === "clinic_admin" || role === "clinic_hr" || role === "clinic_scheduler") {
      const res = await fetch(`${base}/api/clinics/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    }
    return true;
  }

  const login = async (data: LoginBody) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      localStorage.setItem("token", response.token);
      await refetch();
      const hasProfile = await checkProfileComplete(response.user.role, response.token);
      if (!hasProfile) {
        toast({ title: "Welcome back — please complete your profile." });
        setLocation("/onboarding");
        return;
      }
      toast({ title: "Welcome back" });
      setLocation(roleHome[response.user.role] ?? "/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.error || "Invalid credentials",
        variant: "destructive"
      });
      throw error;
    }
  };

  const register = async (data: RegisterBody) => {
    try {
      const response = await registerMutation.mutateAsync({ data });
      localStorage.setItem("token", response.token);
      await refetch();
      toast({ title: "Account created — let's set up your profile!" });
      setLocation("/onboarding");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.error || "Could not create account",
        variant: "destructive"
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      localStorage.removeItem("token");
      await refetch();
      setLocation("/login");
    } catch {
      toast({ title: "Error logging out", variant: "destructive" });
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isUserLoading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

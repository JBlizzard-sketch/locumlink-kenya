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

  const login = async (data: LoginBody) => {
    try {
      await loginMutation.mutateAsync({ data });
      await refetch();
      toast({ title: "Welcome back" });
      setLocation("/");
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
      await registerMutation.mutateAsync({ data });
      await refetch();
      toast({ title: "Account created successfully" });
      setLocation(data.role === "locum" ? "/locum/dashboard" : "/clinic/dashboard");
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

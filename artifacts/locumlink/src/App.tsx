import { Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Router from "@/router";
import { SseWatcher } from "@/components/sse-watcher";
import { toast } from "@/hooks/use-toast";

function is401(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as any).status === 401
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401 (session expired) or 403 (forbidden)
        if (is401(error)) return false;
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          (error as any).status === 403
        ) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: unknown) => {
        // Redirect to login on session expiry
        if (is401(error)) {
          queryClient.clear();
          window.location.href = "/login";
          return;
        }
        // Show a generic error toast for unhandled mutation failures
        const message =
          typeof error === "object" && error !== null && "error" in error
            ? String((error as any).error)
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as any).message)
              : "Something went wrong";
        toast({ title: "Error", description: message, variant: "destructive" });
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <SseWatcher />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

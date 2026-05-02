import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
          <div className="text-center max-w-md">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-destructive/10 text-destructive mx-auto mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">Something went wrong</h1>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              An unexpected error occurred. You can try refreshing the page or go back to the home screen.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/70 font-mono bg-muted rounded-lg px-3 py-2 mb-8 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => { this.reset(); window.location.href = "/"; }}
                className="gap-2"
              >
                <Home className="h-4 w-4" /> Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

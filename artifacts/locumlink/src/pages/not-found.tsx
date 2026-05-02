import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ActivitySquare, Home, LogIn, BriefcaseMedical } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <nav className="h-16 border-b bg-background flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
          <ActivitySquare className="h-6 w-6" />
          <span>LocumLink</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-8xl font-bold font-serif text-primary/20 leading-none select-none mb-2">
            404
          </p>
          <h1 className="text-2xl font-bold tracking-tight mb-3">
            Page not found
          </h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            The page you're looking for doesn't exist or may have moved.
            Try one of the links below to get back on track.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" /> Back to Home
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <LogIn className="h-4 w-4" /> Log In
              </Button>
            </Link>
            <Link href="/locum/shifts">
              <Button variant="ghost" className="gap-2 w-full sm:w-auto text-muted-foreground">
                <BriefcaseMedical className="h-4 w-4" /> Browse Shifts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-background">
        © {new Date().getFullYear()} LocumLink Kenya
      </footer>
    </div>
  );
}

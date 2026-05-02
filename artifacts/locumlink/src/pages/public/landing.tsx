import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ActivitySquare, ArrowRight, ShieldCheck, Zap, Wallet } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="h-20 border-b flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
          <ActivitySquare className="h-8 w-8" />
          <span>LocumLink</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:flex">Log In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 lg:py-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Now live in Nairobi
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-bold font-serif text-foreground tracking-tight mb-6">
          The operating room for Kenya's medical staffing.
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-12">
          Connect with verified private clinics. Pick up shifts on your terms. 
          Instant contracts, verified credentials, and secure escrow payments.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md mx-auto">
          <Link href="/register" className="w-full">
            <Button size="lg" className="w-full h-14 text-lg">
              I'm a Medical Professional <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/register" className="w-full">
            <Button size="lg" variant="outline" className="w-full h-14 text-lg">
              I'm Hiring for a Clinic
            </Button>
          </Link>
        </div>
      </section>

      {/* Features/Trust Signals */}
      <section className="bg-secondary/50 py-24 px-6 lg:px-12 border-y">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">100% Verified Network</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every practitioner's KMPDC and nursing council credentials are cross-checked. Every clinic is physically verified. Zero fake profiles.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Frictionless Matching</h3>
              <p className="text-muted-foreground leading-relaxed">
                Smart routing matches specialties, rates, and availability instantly. No endless WhatsApp groups or missed calls.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Guaranteed Payments</h3>
              <p className="text-muted-foreground leading-relaxed">
                Funds are held in escrow before the shift starts. Completed shift? Instant MPESA payout. No chasing clinics for your money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 text-center text-muted-foreground border-t mt-auto">
        <p>© {new Date().getFullYear()} LocumLink Kenya. Designed for medical professionals.</p>
      </footer>
    </div>
  );
}
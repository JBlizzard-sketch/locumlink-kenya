import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState } from "react";
import {
  ActivitySquare, ArrowRight, ShieldCheck, Zap, Wallet, Star,
  CheckCircle2, Clock, FileText, Bell, TrendingUp, Users,
  Building2, BriefcaseMedical, Calendar, Phone, ChevronRight,
  MapPin, Quote,
} from "lucide-react";

const STATS = [
  { value: "1,200+", label: "Verified Locums" },
  { value: "340+", label: "Private Clinics" },
  { value: "8,400+", label: "Shifts Filled" },
  { value: "KES 2.1B+", label: "Paid Out" },
];

const SPECIALTIES = [
  "General Practice", "Emergency Medicine", "Paediatrics", "Obstetrics & Gynaecology",
  "Internal Medicine", "Anaesthesia", "Radiology", "Surgery", "Psychiatry",
  "Nursing (ICU)", "Nursing (Theatre)", "Clinical Pharmacy",
];

const LOCUM_STEPS = [
  {
    n: "01",
    title: "Create Your Profile",
    body: "Upload your KMPDC certificate, practising licence, and ID. Our team verifies credentials within 48 hours.",
    icon: FileText,
  },
  {
    n: "02",
    title: "Browse & Apply",
    body: "Browse open shifts in Nairobi, filter by specialty and rate, and apply with one tap. Smart matching surfaces the best fits first.",
    icon: BriefcaseMedical,
  },
  {
    n: "03",
    title: "Work & Get Paid",
    body: "Sign a digital contract, complete your shift, and receive your M-Pesa payout automatically. No invoices, no chasing.",
    icon: Wallet,
  },
];

const CLINIC_STEPS = [
  {
    n: "01",
    title: "Post a Shift",
    body: "Fill out a simple form — specialty, date, time, and rate. Publish in under 2 minutes. Use templates for recurring needs.",
    icon: Calendar,
  },
  {
    n: "02",
    title: "Review Applicants",
    body: "See verified candidates with reliability scores, review ratings, and match scores. Shortlist, confirm, or reject with a single click.",
    icon: Users,
  },
  {
    n: "03",
    title: "Covered & Compliant",
    body: "Auto-generated contracts, verified professional indemnity, and full audit trail. Your HR team stays in control.",
    icon: ShieldCheck,
  },
];

const FEATURES = [
  { icon: ShieldCheck, title: "KMPDC & Nursing Council Verified", body: "Every practitioner's credentials are cross-referenced against official registries. No self-declaration, no fake profiles." },
  { icon: Zap, title: "Smart Specialty Matching", body: "Our algorithm ranks applicants by match score — specialty, years of experience, reliability, and sub-county proximity." },
  { icon: Wallet, title: "M-Pesa Escrow Payments", body: "Funds are locked in before the shift starts. Work completed → payment released instantly. No invoicing, no delays." },
  { icon: FileText, title: "Digital Contracts", body: "Legally binding employment contracts generated automatically on every booking. Signed electronically and stored securely." },
  { icon: Bell, title: "SMS Urgency Alerts", body: "Emergency shift? Matching locums are alerted by SMS within minutes. Fill critical gaps before they become crises." },
  { icon: TrendingUp, title: "Analytics & Reporting", body: "Clinics see fill rates, spend, and locum performance. Locums track earnings, shifts, and reliability scores." },
];

const TESTIMONIALS = [
  {
    quote: "Before LocumLink I spent every Friday on WhatsApp trying to cover weekend shifts. Now I post once and get 4–6 verified applicants by morning.",
    name: "Dr. Amina Ochieng",
    role: "Medical Director, Premier Clinic Kilimani",
    initials: "AO",
    color: "bg-teal-100 text-teal-700",
  },
  {
    quote: "I picked up 11 locum shifts last quarter around my registrar rotation. The M-Pesa payments arrive before I've even left the car park.",
    name: "Dr. Kevin Muthama",
    role: "Emergency Medicine Registrar, Nairobi",
    initials: "KM",
    color: "bg-blue-100 text-blue-700",
  },
  {
    quote: "The verified badge is everything. Our medical board requires that every locum has valid practising certificates — LocumLink handles all of that automatically.",
    name: "Dr. Grace Njeri",
    role: "HR Manager, Aga Khan Health Services",
    initials: "GN",
    color: "bg-purple-100 text-purple-700",
  },
];

const NAIROBI_AREAS = ["Westlands", "Kilimani", "Karen", "Lavington", "Upper Hill", "Langata", "Embakasi", "Kasarani", "Ruaraka", "Roysambu"];

function NavBar() {
  return (
    <nav className="h-18 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4">
      <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-primary">
        <ActivitySquare className="h-7 w-7" />
        <span>LocumLink</span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
        <a href="#testimonials" className="hover:text-foreground transition-colors">Reviews</a>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login">
          <Button variant="ghost" size="sm">Log In</Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="hidden sm:flex gap-1.5">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-4 pt-20 pb-28 overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        Now live across Nairobi
      </div>

      <h1 className="text-5xl lg:text-7xl font-bold font-serif text-foreground tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
        Kenya's medical staffing,{" "}
        <span className="text-primary">finally done right.</span>
      </h1>

      <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
        Verified locum doctors and nurses. Instant M-Pesa payouts. Digital contracts.
        Real-time matching — built for Nairobi's private healthcare market.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
        <Link href="/register">
          <Button size="lg" className="h-14 px-8 text-base gap-2">
            I'm a Medical Professional <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/register">
          <Button size="lg" variant="outline" className="h-14 px-8 text-base gap-2">
            <Building2 className="h-4 w-4" /> I'm Hiring for a Clinic
          </Button>
        </Link>
      </div>

      {/* Trust badge row */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        {[
          { icon: ShieldCheck, label: "KMPDC Verified" },
          { icon: Phone, label: "M-Pesa Payouts" },
          { icon: FileText, label: "Digital Contracts" },
          { icon: MapPin, label: "Nairobi Focus" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-primary" /> {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="border-y bg-muted/30 py-12 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
        {STATS.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl lg:text-4xl font-bold font-serif text-primary">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const [tab, setTab] = useState<"locum" | "clinic">("locum");
  const steps = tab === "locum" ? LOCUM_STEPS : CLINIC_STEPS;

  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">How It Works</Badge>
          <h2 className="text-4xl font-bold font-serif tracking-tight mb-4">
            Up and running in minutes
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you're a locum looking for shifts or a clinic covering a gap, LocumLink gets you there fast.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-12">
          <Button
            variant={tab === "locum" ? "default" : "outline"}
            onClick={() => setTab("locum")}
            className="gap-2"
          >
            <BriefcaseMedical className="h-4 w-4" /> For Locums
          </Button>
          <Button
            variant={tab === "clinic" ? "default" : "outline"}
            onClick={() => setTab("clinic")}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" /> For Clinics
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px bg-border" />

          {steps.map(({ n, title, body, icon: Icon }, i) => (
            <div key={n} className="flex flex-col items-start gap-4 relative">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground font-bold text-lg font-serif shadow-md relative z-10">
                {n}
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/register">
            <Button className="gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24 px-6 lg:px-12 bg-muted/20 border-y">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Platform Features</Badge>
          <h2 className="text-4xl font-bold font-serif tracking-tight mb-4">
            Everything you need, nothing you don't
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built specifically for Kenya's private healthcare staffing challenges — not a generic global product bolted onto Nairobi.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Specialties() {
  return (
    <section className="py-20 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto text-center">
        <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Specialties</Badge>
        <h2 className="text-4xl font-bold font-serif tracking-tight mb-4">
          Every specialty, all in one place
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10">
          From general practice locums to specialist cover — LocumLink has verified professionals across all clinical areas.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {SPECIALTIES.map(s => (
            <Badge key={s} variant="secondary" className="px-4 py-2 text-sm font-medium rounded-full">
              {s}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground/70">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Available across:
          </span>
          {NAIROBI_AREAS.map(area => (
            <span key={area}>{area}</span>
          ))}
          <span>& more</span>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6 lg:px-12 bg-muted/20 border-y">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Testimonials</Badge>
          <h2 className="text-4xl font-bold font-serif tracking-tight mb-4">
            Trusted by Nairobi's best clinicians
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, role, initials, color }) => (
            <div key={name} className="bg-background rounded-2xl p-6 border shadow-sm flex flex-col gap-4">
              <Quote className="h-6 w-6 text-primary/30" />
              <p className="text-sm leading-relaxed text-foreground/80 flex-1 italic">"{quote}"</p>
              <div className="flex items-center gap-3 pt-3 border-t">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  const rows = [
    { label: "Credential verification", old: "Manual, slow", locumlink: "Automated, 48h" },
    { label: "Finding a locum", old: "WhatsApp groups", locumlink: "Smart matching" },
    { label: "Contracts", old: "Verbal / paper", locumlink: "Digital, instant" },
    { label: "Payment", old: "Invoice, 30–90 days", locumlink: "M-Pesa, same day" },
    { label: "Dispute resolution", old: "None / ad hoc", locumlink: "Platform mediation" },
    { label: "Audit trail", old: "Spreadsheets", locumlink: "Full history" },
  ];

  return (
    <section className="py-24 px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">Why LocumLink</Badge>
          <h2 className="text-4xl font-bold font-serif tracking-tight mb-4">
            The old way vs. LocumLink
          </h2>
        </div>
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-sm font-semibold text-muted-foreground border-b">
            <span></span>
            <span className="text-center">Old Way</span>
            <span className="text-center text-primary">LocumLink</span>
          </div>
          {rows.map(({ label, old, locumlink }, i) => (
            <div key={label} className={`grid grid-cols-3 px-4 py-4 items-center text-sm ${i % 2 === 0 ? "bg-background" : "bg-muted/20"} border-b last:border-0`}>
              <span className="font-medium">{label}</span>
              <span className="text-center text-muted-foreground">{old}</span>
              <span className="text-center font-semibold text-primary flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {locumlink}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 px-6 lg:px-12 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl lg:text-5xl font-bold font-serif tracking-tight mb-6">
          Ready to transform how you staff?
        </h2>
        <p className="text-primary-foreground/80 text-xl max-w-2xl mx-auto mb-10">
          Join over 1,200 verified medical professionals and 340 private clinics already using LocumLink in Nairobi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" variant="secondary" className="h-14 px-10 text-base gap-2 font-semibold">
              <BriefcaseMedical className="h-4 w-4" /> Sign up as a Locum
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" className="h-14 px-10 text-base gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold">
              <Building2 className="h-4 w-4" /> Register Your Clinic
            </Button>
          </Link>
        </div>
        <p className="text-primary-foreground/60 text-sm mt-8">
          Free to sign up · No hidden fees · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-16 px-6 lg:px-12 border-t">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary mb-4">
              <ActivitySquare className="h-6 w-6" />
              <span>LocumLink</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Kenya's only end-to-end locum marketplace — verified credentials, smart matching, instant M-Pesa payouts, and digital contracts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/register" className="hover:text-foreground transition-colors">Sign Up</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Log In</Link></li>
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Nairobi Coverage</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {NAIROBI_AREAS.slice(0, 6).map(area => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LocumLink Kenya Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> KMPDC Partner
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-primary" /> M-Pesa Enabled
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <Specialties />
      <Testimonials />
      <ComparisonTable />
      <CTASection />
      <Footer />
    </div>
  );
}

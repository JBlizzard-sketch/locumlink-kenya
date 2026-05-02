import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  BriefcaseMedical, 
  CalendarDays, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  User, 
  Bell, 
  Wallet,
  ActivitySquare,
  Users,
  FileText,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const locumNav = [
    { name: "Dashboard", href: "/locum/dashboard", icon: LayoutDashboard },
    { name: "Find Shifts", href: "/locum/shifts", icon: BriefcaseMedical },
    { name: "My Applications", href: "/locum/applications", icon: ActivitySquare },
    { name: "My Bookings", href: "/locum/bookings", icon: CalendarDays },
    { name: "Earnings", href: "/locum/earnings", icon: Wallet },
    { name: "Documents", href: "/locum/documents", icon: FileText },
    { name: "Notifications", href: "/locum/notifications", icon: Bell },
    { name: "Ratings", href: "/locum/ratings", icon: Star },
    { name: "Profile", href: "/locum/profile", icon: User },
  ];

  const clinicNav = [
    { name: "Dashboard", href: "/clinic/dashboard", icon: LayoutDashboard },
    { name: "Manage Shifts", href: "/clinic/shifts", icon: BriefcaseMedical },
    { name: "Active Bookings", href: "/clinic/bookings", icon: CalendarDays },
    { name: "Locum Directory", href: "/clinic/locums", icon: Users },
    { name: "Analytics", href: "/clinic/analytics", icon: ActivitySquare },
    { name: "Clinic Profile", href: "/clinic/profile", icon: Settings },
  ];

  const adminNav = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Verifications", href: "/admin/verification", icon: Users },
    { name: "Disputes", href: "/admin/disputes", icon: ActivitySquare },
  ];

  const navItems = user?.role === "locum" 
    ? locumNav 
    : user?.role === "clinic_admin" || user?.role === "clinic_hr" 
      ? clinicNav 
      : user?.role === "platform_admin" ? adminNav : [];

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col h-full hidden md:flex">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <ActivitySquare className="h-6 w-6" />
            <span>LocumLink</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.email}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 md:hidden">
           <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold text-primary">
            <ActivitySquare className="h-5 w-5" />
            <span>LocumLink</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
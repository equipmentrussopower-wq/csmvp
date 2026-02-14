import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, LayoutDashboard, ArrowLeftRight, CreditCard, Shield, LogOut, User, History, Settings, HelpCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const allItems = [...navItems, ...(isAdmin ? adminItems : [])];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header bar */}
      <header className="bg-primary text-primary-foreground h-16 flex items-center px-6 shadow-md z-10">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <Building2 className="h-7 w-7" />
          <span className="font-serif">EduBank</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <User className="h-4 w-4" />
            <span>{profile?.full_name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:block">
          <nav className="p-4 space-y-1">
            {allItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

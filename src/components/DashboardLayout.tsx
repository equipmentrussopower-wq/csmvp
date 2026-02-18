import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ArrowLeftRight, CreditCard, Shield, LogOut, User, History, Settings, HelpCircle, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ChaseLogo from "@/components/ChaseLogo";
import { TopProgressBar } from "@/components/PageLoader";
import { Badge } from "@/components/ui/badge";

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
  const { profile, isAdmin, kycStatus, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const allItems = [...navItems, ...(isAdmin ? adminItems : [])];

  return (
    <div className="min-h-screen flex flex-col">
      {isNavigating && <TopProgressBar />}
      {/* Top header bar */}
      <header className="bg-white text-foreground h-16 flex items-center px-6 shadow-md z-10 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center">
          <ChaseLogo className="h-8 w-auto text-gray-900" />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="h-4 w-4" />
            <span>{profile?.full_name}</span>
            {kycStatus === "pending" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-amber-50 text-amber-600 border-amber-200">
                KYC Pending
              </Badge>
            )}
            {kycStatus === "rejected" && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-red-50 text-red-600 border-red-200">
                KYC Rejected
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-700 hover:bg-gray-100">
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

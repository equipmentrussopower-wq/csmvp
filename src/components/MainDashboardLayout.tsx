import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ArrowLeftRight, CreditCard, Shield, LogOut, History, Settings, HelpCircle, Bell, Search, Plus, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ChaseLogo from "@/components/ChaseLogo";
import { TopProgressBar } from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

const mobileNavItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/transfer", label: "Pay", icon: ArrowLeftRight },
  { href: "/transactions", label: "History", icon: History },
];

export const MainDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.user_id) return;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id", { count: 'exact' })
        .eq("is_read", false)
        .or(`user_id.eq.${profile.user_id},user_id.is.null`);
      setUnreadCount(data?.length || 0);
    };

    fetchUnread();

    // Subtle subscription to new notifications
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

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
  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      {isNavigating && <TopProgressBar />}

      {/* ── Blue Header ── */}
      <div className="bg-[#0E76C7] text-white">
        {/* Row 1: Search bar + Bell + Avatar */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-white/70" />
            </div>
            <input
              type="text"
              placeholder="Search in the app"
              className="w-full bg-white/20 border-none rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/40 focus:outline-none transition-all"
            />
          </div>
          
          <button
            onClick={() => navigate("/notifications")}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative flex-shrink-0"
          >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-4 min-w-[16px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border border-[#0E76C7] px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          
          <div
            onClick={() => navigate("/profile")}
            className="h-9 w-9 flex items-center justify-center bg-white/20 rounded-full text-base font-bold cursor-pointer hover:bg-white/30 transition-colors flex-shrink-0"
          >
            {initial}
          </div>
        </div>

        {/* Row 2: Chase Logo + Greeting + PlusIcon */}
        <div className="flex items-center justify-between px-4 pt-2 pb-6">
          <div className="flex items-center gap-3">
            <ChaseLogo className="h-10 text-white" style={{ color: "white", width: "150px" }} />
            <div className="flex flex-col">
              <span className="text-white font-bold leading-tight" style={{
                fontSize: "22px"
              }}>
                Hi, {profile?.full_name || "User"} 
              </span>
            </div>
          </div>
          
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => navigate("/transfer")}
          >
            <Plus className="h-7 w-7 text-white" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 pt8 px4 relative">
        {/* Desktop Sidebar */}
        <aside className="w-60 bg-white text-gray-700 border-r border-gray-200 hidden md:flex flex-col flex-shrink-0">
          <nav className="p-4 space-y-1 flex-1">
            {allItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-blue-50 text-[#0E76C7]"
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors w-full px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-4 pb-20 md:pb-6 -mt-6">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navbar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-1 z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors relative",
                isActive ? "text-[#0E76C7]" : "text-gray-400"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0E76C7] rounded-b-full" />
              )}
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

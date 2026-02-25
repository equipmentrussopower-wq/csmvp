import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    ChevronLeft, Camera, User, Mail, Phone, CreditCard,
    LogOut, KeyRound, ChevronRight,
    LayoutDashboard, ArrowLeftRight, History
} from "lucide-react";
import ChaseLogo from "@/components/ChaseLogo";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const Profile = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchAccounts = async () => {
            const { data } = await supabase
                .from("accounts")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            setAccounts(data || []);
            setLoading(false);
        };
        fetchAccounts();
    }, [user]);

    const initial = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "RE";
    const fullName = profile?.full_name || "Account Holder";
    const email = user?.email || "";
    const phone = profile?.phone || "Not set";

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#0E76C7] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <main className="flex-1 pb-20">
                {/* Header Section */}
                <div className="bg-[#0E76C7] px-4 pt-4 pb-16 text-white relative">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <ChaseLogo className="h-6 text-white" style={{ filter: 'brightness(0) invert(1)', width: '100px' }} />
                        <div className="w-10"></div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white mb-4 border-4 border-white/30 overflow-hidden hover:opacity-90 transition-opacity">
                                {initial}
                            </div>
                            <button className="absolute bottom-3 right-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors">
                                <Camera className="w-4 h-4 text-[#0E76C7]" />
                            </button>
                        </div>
                        <h1 className="text-2xl font-bold text-white">{fullName}</h1>
                        <p className="text-white/70 text-sm">Chase Premier Member</p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="px-4 -mt-8 relative z-10 space-y-4">
                    {/* Personal Information */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                        <div className="p-6 pb-2">
                            <h3 className="font-semibold tracking-tight text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-[#0E76C7]" />
                                Personal Information
                            </h3>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border/50">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                                        <p className="font-semibold text-sm">{email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                                        <p className="font-semibold text-sm">{phone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                        <div className="p-6 pb-2">
                            <h3 className="font-semibold tracking-tight text-lg flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-[#0E76C7]" />
                                Account Details
                            </h3>
                        </div>
                        <div className="p-6 pt-0 space-y-6">
                            {accounts.length === 0 ? (
                                <p className="text-center py-6 text-muted-foreground text-sm italic">No accounts found</p>
                            ) : (
                                accounts.map((account, index) => (
                                    <div key={account.id} className={cn("py-4", index !== 0 && "border-t border-border/50")}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">
                                                {account.account_type === 'checking' ? 'TOTAL CHECKING' :
                                                    account.account_type === 'savings' ? 'CHASE SAVINGS' : 'CURRENT ACCOUNT'}
                                            </h4>
                                            <span className="text-xl font-bold text-gray-900">
                                                ${Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs">
                                            <div className="flex justify-between bg-muted/40 p-2.5 rounded-lg border border-border/10">
                                                <span className="text-muted-foreground">Account Number</span>
                                                <span className="font-mono font-medium">{account.account_number}</span>
                                            </div>
                                            <div className="flex justify-between bg-muted/40 p-2.5 rounded-lg border border-border/10">
                                                <span className="text-muted-foreground">Routing Number</span>
                                                <span className="font-mono font-medium">021000021</span>
                                            </div>
                                            <div className="flex justify-between bg-muted/40 p-2.5 rounded-lg border border-border/10">
                                                <span className="text-muted-foreground">ACH Number</span>
                                                <span className="font-mono font-medium">{account.account_number}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Change PIN ── */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <button
                            onClick={() => navigate("/change-pin")}
                            className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4 text-[#0E76C7]" />
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-sm text-gray-900">Change Transaction PIN</p>
                                    <p className="text-xs text-muted-foreground">Update your 4-digit transfer PIN</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    {/* Sign Out Button */}
                    <button
                        onClick={handleSignOut}
                        className="w-full h-14 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-red-600 font-bold hover:bg-red-50 transition-colors active:scale-[0.98] mt-4 mb-20"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 h-20 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-around h-full px-1">
                    {[
                        { href: "/dashboard", label: "Home", Icon: LayoutDashboard },
                        { href: "/accounts", label: "Accounts", Icon: CreditCard },
                        { href: "/cards", label: "Cards", Icon: CreditCard },
                        { href: "/transfer", label: "Wire", Icon: ArrowLeftRight },
                        { href: "/transactions", label: "History", Icon: History },
                    ].map(({ href, label, Icon }) => (
                        <button
                            key={href}
                            onClick={() => navigate(href)}
                            className="flex flex-col items-center gap-1 py-2 px-2 min-w-[56px] text-muted-foreground hover:text-[#0E76C7] transition-colors"
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default Profile;

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import {
  ChevronLeft, CreditCard, ArrowLeftRight, History,
  LayoutDashboard, TrendingUp, Eye, EyeOff, Copy, CheckCheck,
  RefreshCw, ArrowUpRight, ArrowDownLeft, Landmark
} from "lucide-react";
import ChaseLogo from "@/components/ChaseLogo";

const Accounts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideBalances, setHideBalances] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAccounts(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBalance = (n: number) =>
    hideBalances ? "••••••" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const accountLabel = (type: string) => {
    if (type === "checking") return { label: "Total Checking", abbr: "CHK", gradient: "from-[#0E76C7] to-[#1a9be6]" };
    if (type === "savings") return { label: "Chase Savings", abbr: "SAV", gradient: "from-[#0d6baf] to-[#0E76C7]" };
    return { label: "Current Account", abbr: "CUR", gradient: "from-[#134e9f] to-[#1762c9]" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#0E76C7] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans">

      {/* ── Header ── */}
      <div className="bg-[#0E76C7] px-4 pt-4 pb-20 text-white">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <ChaseLogo className="h-6" style={{ filter: "brightness(0) invert(1)", width: "100px" }} />
          <button onClick={() => setHideBalances(v => !v)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Total portfolio */}
        <div className="text-center py-2">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Total Portfolio</p>
          <h1 className="text-4xl font-black tracking-tight">{formatBalance(totalBalance)}</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 bg-green-500/20 rounded-full px-3 py-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-300" />
            <span className="text-green-200 text-xs font-semibold">{accounts.length} Active Account{accounts.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* ── Account Cards ── */}
      <div className="px-4 -mt-12 space-y-4 pb-28 relative z-10">

        {accounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 text-center shadow-sm border border-gray-100">
            <Landmark className="w-14 h-14 text-gray-200" />
            <p className="font-semibold text-gray-500">No accounts found</p>
            <p className="text-sm text-gray-400">Your accounts are being set up. Please check back shortly.</p>
          </div>
        ) : (
          accounts.map((account) => {
            const { label, abbr, gradient } = accountLabel(account.account_type);
            return (
              <div key={account.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card top — gradient band */}
                <div className={cn("bg-gradient-to-r p-5 text-white", gradient)}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{abbr}</p>
                      <h3 className="text-lg font-black mt-0.5">{label}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mb-1">
                    <p className="text-white/60 text-xs mb-0.5">Available Balance</p>
                    <p className="text-3xl font-black">{formatBalance(Number(account.balance))}</p>
                  </div>

                  {/* Status pill */}
                  <div className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold mt-3",
                    account.status === "active" ? "bg-green-400/20 text-green-100" : "bg-red-400/20 text-red-100"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", account.status === "active" ? "bg-green-300" : "bg-red-300")} />
                    {account.status.toUpperCase()}
                  </div>
                </div>

                {/* Card bottom — account info */}
                <div className="px-5 py-4 space-y-3">
                  <DetailRow
                    label="Account Number"
                    value={account.account_number}
                    onCopy={() => copyToClipboard(account.account_number, account.id + "_acct")}
                    copied={copiedId === account.id + "_acct"}
                  />
                  <DetailRow
                    label="Routing Number"
                    value="021000021"
                    onCopy={() => copyToClipboard("021000021", account.id + "_rtn")}
                    copied={copiedId === account.id + "_rtn"}
                  />
                  <DetailRow
                    label="ACH Number"
                    value={account.account_number}
                    onCopy={() => copyToClipboard(account.account_number, account.id + "_ach")}
                    copied={copiedId === account.id + "_ach"}
                  />

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => navigate("/transfer")}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0E76C7]/8 text-[#0E76C7] font-bold text-sm hover:bg-[#0E76C7]/15 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Send Wire
                    </button>
                    <button
                      onClick={() => navigate("/transactions")}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      History
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 h-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 min-w-[56px] transition-colors",
                href === "/accounts" ? "text-[#0E76C7]" : "text-muted-foreground hover:text-[#0E76C7]"
              )}
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

// ── Helper ────────────────────────────────────────────────────────────────────
const DetailRow = ({
  label, value, onCopy, copied
}: { label: string; value: string; onCopy: () => void; copied: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <div>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-mono font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
    <button
      onClick={onCopy}
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#0E76C7]"
    >
      {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  </div>
);

export default Accounts;

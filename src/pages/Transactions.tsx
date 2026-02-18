import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, RotateCcw,
  ChevronRight, X, Download, CheckCircle2, Clock, XCircle,
  Calendar, Hash, FileText, CreditCard, Share2, Layers,
  TrendingUp, TrendingDown, Repeat2, AlertCircle
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Txn = Tables<"transactions">;

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupByDate(txns: Txn[]): Record<string, Txn[]> {
  return txns.reduce<Record<string, Txn[]>>((acc, txn) => {
    const d = new Date(txn.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!acc[label]) acc[label] = [];
    acc[label].push(txn);
    return acc;
  }, {});
}

function txnIcon(type: string) {
  switch (type) {
    case "deposit":    return { Icon: ArrowDownLeft,  bg: "bg-green-100",  color: "text-green-600"  };
    case "withdrawal": return { Icon: ArrowUpRight,   bg: "bg-red-100",    color: "text-red-500"    };
    case "transfer":   return { Icon: ArrowLeftRight, bg: "bg-blue-100",   color: "text-[#117ACA]"  };
    case "reversal":   return { Icon: RotateCcw,      bg: "bg-amber-100",  color: "text-amber-600"  };
    default:           return { Icon: AlertCircle,    bg: "bg-gray-100",   color: "text-gray-500"   };
  }
}

function amountColor(type: string) {
  if (type === "deposit") return "text-green-600";
  if (type === "withdrawal" || type === "reversal") return "text-red-500";
  if (type === "transfer") return "text-[#117ACA]";
  return "text-gray-700";
}

function amountPrefix(type: string) {
  if (type === "deposit") return "+";
  if (type === "withdrawal" || type === "reversal") return "-";
  if (type === "transfer") return "↔ ";
  return "";
}

function statusConfig(status: string) {
  switch (status) {
    case "completed": return { label: "Completed", Icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200" };
    case "reversed":  return { label: "Reversed",  Icon: XCircle,      cls: "bg-red-50 text-red-600 border-red-200"       };
    default:          return { label: "Pending",   Icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" };
  }
}

// Filter config — dynamically built from actual data + fixed types
const FILTER_TYPES = [
  { key: "all",        label: "All",        Icon: Layers,        activeBg: "bg-gray-900",    activeText: "text-white", dot: "bg-gray-400"   },
  { key: "deposit",    label: "Deposits",   Icon: TrendingDown,  activeBg: "bg-green-500",   activeText: "text-white", dot: "bg-green-400"  },
  { key: "withdrawal", label: "Withdrawals",Icon: TrendingUp,    activeBg: "bg-red-500",     activeText: "text-white", dot: "bg-red-400"    },
  { key: "transfer",   label: "Transfers",  Icon: ArrowLeftRight,activeBg: "bg-[#117ACA]",   activeText: "text-white", dot: "bg-blue-400"   },
  { key: "reversal",   label: "Reversals",  Icon: Repeat2,       activeBg: "bg-amber-500",   activeText: "text-white", dot: "bg-amber-400"  },
];

// ── Statement generator ───────────────────────────────────────────────────────
function openStatement(transactions: Txn[], userName: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const rows = transactions.map((txn) => {
    const prefix = amountPrefix(txn.transaction_type);
    const amt = `${prefix}$${Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const color = txn.transaction_type === "deposit" ? "#16a34a" : (txn.transaction_type === "withdrawal" || txn.transaction_type === "reversal") ? "#ef4444" : "#117ACA";
    return `<tr>
      <td>${new Date(txn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
      <td class="mono">${txn.reference_code}</td>
      <td style="text-transform:capitalize">${txn.transaction_type}</td>
      <td>${txn.narration || "—"}</td>
      <td>${txn.status}</td>
      <td style="color:${color};font-weight:700;text-align:right">${amt}</td>
    </tr>`;
  }).join("");

  w.document.write(`<!DOCTYPE html><html><head>
    <title>Account Statement</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;padding:40px;color:#111}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #117ACA}
      .brand{font-size:28px;font-weight:900;color:#117ACA;letter-spacing:-1px}
      .meta{text-align:right;font-size:13px;color:#666;line-height:1.6}
      h2{font-size:18px;font-weight:700;margin-bottom:16px;color:#111}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f5f7fa;padding:10px 12px;text-align:left;font-weight:600;color:#555;border-bottom:1px solid #e5e7eb}
      td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}
      tr:last-child td{border-bottom:none}
      .mono{font-family:monospace;font-size:11px}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}
      @media print{body{padding:20px}}
    </style>
  </head><body>
    <div class="header">
      <div class="brand">CHASE</div>
      <div class="meta">
        <strong>${userName}</strong><br/>
        Statement generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}<br/>
        Total transactions: ${transactions.length}
      </div>
    </div>
    <h2>Transaction Statement</h2>
    <table>
      <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Description</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">This is an official account statement generated by Chase Banking System. © ${new Date().getFullYear()} Chase Bank.</div>
    <script>setTimeout(()=>window.print(),400);<\/script>
  </body></html>`);
  w.document.close();
}

// ── Main Component ────────────────────────────────────────────────────────────
const Transactions = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Txn | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTransactions(data ?? []);
        setLoading(false);
      });
  }, [user]);

  // Counts per type for badges
  const counts = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
    acc["all"] = (acc["all"] || 0) + 1;
    return acc;
  }, {});

  const filtered = filter === "all"
    ? transactions
    : transactions.filter((t) => t.transaction_type === filter);

  const grouped = groupByDate(filtered);

  return (
    <DashboardLayout>
      <div className="pb-8 space-y-0">

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your recent banking activity</p>
          </div>
          <button
            onClick={() => openStatement(transactions, profile?.full_name || "Account Holder")}
            className="flex items-center gap-1.5 text-sm text-[#117ACA] font-semibold bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download Statement</span>
            <span className="sm:hidden">Statement</span>
          </button>
        </div>

        {/* ── Filter Cards ── */}
        <div className="px-4 pb-4">
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {FILTER_TYPES.map(({ key, label, Icon: FilterIcon, activeBg, activeText, dot }) => {
              const isActive = filter === key;
              const count = counts[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-start gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 min-w-[100px]",
                    isActive
                      ? `${activeBg} ${activeText} border-transparent shadow-md scale-[1.02]`
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center",
                    isActive ? "bg-white/20" : "bg-gray-100"
                  )}>
                    <FilterIcon className={cn("h-4 w-4", isActive ? activeText : "text-gray-500")} />
                  </div>
                  <div className="text-left">
                    <p className={cn("text-xs font-semibold leading-tight", isActive ? activeText : "text-gray-700")}>{label}</p>
                    <p className={cn("text-[11px] mt-0.5", isActive ? "text-white/70" : "text-gray-400")}>{count} txns</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── List ── */}
        <div className="px-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-[#117ACA] border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No transactions found</p>
              <p className="text-xs mt-1">Try a different filter or check back later.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, txns]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{date}</p>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {txns.map((txn) => {
                    const { Icon, bg, color } = txnIcon(txn.transaction_type);
                    return (
                      <button
                        key={txn.id}
                        onClick={() => setSelected(txn)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0", bg)}>
                          <Icon className={cn("h-5 w-5", color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {txn.narration || (txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1))}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{txn.reference_code}</p>
                        </div>
                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <div>
                            <p className={cn("font-bold text-sm", amountColor(txn.transaction_type))}>
                              {amountPrefix(txn.transaction_type)}${Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-gray-400 capitalize mt-0.5">{txn.status}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selected && (
        <TransactionDetail txn={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  );
};

// ── Transaction Detail Sheet ──────────────────────────────────────────────────
const TransactionDetail = ({ txn, onClose }: { txn: Txn; onClose: () => void }) => {
  const { Icon, bg, color } = txnIcon(txn.transaction_type);
  const status = statusConfig(txn.status);
  const { Icon: StatusIcon } = status;
  const [copied, setCopied] = useState(false);

  const handleDownloadReceipt = () => {
    const w = window.open("", "_blank", "width=480,height=700");
    if (!w) return;
    const prefix = amountPrefix(txn.transaction_type);
    const amount = `${prefix}$${Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const amtColor = txn.transaction_type === "deposit" ? "#16a34a" : (txn.transaction_type === "withdrawal" || txn.transaction_type === "reversal") ? "#ef4444" : "#117ACA";
    const statusBg = txn.status === "completed" ? "#dcfce7" : txn.status === "reversed" ? "#fee2e2" : "#fef9c3";
    const statusClr = txn.status === "completed" ? "#15803d" : txn.status === "reversed" ? "#dc2626" : "#a16207";
    const date = new Date(txn.created_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt – ${txn.reference_code}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:32px 16px}
        .card{background:white;border-radius:16px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
        .hdr{background:#117ACA;color:white;padding:28px 24px;text-align:center}
        .hdr h1{font-size:24px;font-weight:900;letter-spacing:-1px}
        .hdr p{font-size:13px;opacity:.75;margin-top:4px}
        .amt-box{padding:28px 24px;text-align:center;border-bottom:1px solid #f0f0f0}
        .amt{font-size:40px;font-weight:800;color:${amtColor}}
        .type{font-size:13px;color:#888;margin-top:6px;text-transform:capitalize}
        .badge{display:inline-block;margin-top:10px;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:600;background:${statusBg};color:${statusClr}}
        .rows{padding:8px 24px 24px}
        .row{display:flex;justify-content:space-between;align-items:flex-start;padding:13px 0;border-bottom:1px solid #f5f5f5;gap:12px}
        .row:last-child{border-bottom:none}
        .lbl{font-size:13px;color:#888;flex-shrink:0}
        .val{font-size:13px;font-weight:600;color:#111;text-align:right;word-break:break-all}
        .mono{font-family:monospace;font-size:12px}
        .footer{background:#f9f9f9;padding:16px 24px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee}
        @media print{body{background:white;padding:0}.card{box-shadow:none;border-radius:0}}
      </style>
    </head><body>
      <div class="card">
        <div class="hdr"><h1>CHASE</h1><p>Transaction Receipt</p></div>
        <div class="amt-box">
          <div class="amt">${amount}</div>
          <div class="type">${txn.transaction_type}</div>
          <div class="badge">${status.label}</div>
        </div>
        <div class="rows">
          <div class="row"><span class="lbl">Reference</span><span class="val mono">${txn.reference_code}</span></div>
          <div class="row"><span class="lbl">Date & Time</span><span class="val">${date}</span></div>
          <div class="row"><span class="lbl">Description</span><span class="val">${txn.narration || "—"}</span></div>
          <div class="row"><span class="lbl">Type</span><span class="val" style="text-transform:capitalize">${txn.transaction_type}</span></div>
          ${txn.sender_account_id ? `<div class="row"><span class="lbl">From Account</span><span class="val mono">...${txn.sender_account_id.slice(-8)}</span></div>` : ""}
          ${txn.receiver_account_id ? `<div class="row"><span class="lbl">To Account</span><span class="val mono">...${txn.receiver_account_id.slice(-8)}</span></div>` : ""}
        </div>
        <div class="footer">Generated by Chase Banking · ${new Date().toLocaleDateString()}</div>
      </div>
      <script>setTimeout(()=>window.print(),400);<\/script>
    </body></html>`);
    w.document.close();
  };

  const handleShare = async () => {
    const text = [
      `CHASE Transaction Receipt`,
      `─────────────────────────`,
      `Ref:    ${txn.reference_code}`,
      `Amount: ${amountPrefix(txn.transaction_type)}$${Number(txn.amount).toFixed(2)}`,
      `Type:   ${txn.transaction_type}`,
      `Status: ${txn.status}`,
      `Date:   ${new Date(txn.created_at).toLocaleString()}`,
      txn.narration ? `Note:   ${txn.narration}` : null,
    ].filter(Boolean).join("\n");

    try {
      // Try native share first (works on mobile/HTTPS)
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Transaction Receipt", text });
        return;
      }
      // Always-reliable clipboard fallback
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Last resort: create a temporary textarea and copy
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Amount hero */}
        <div className="flex flex-col items-center py-6 px-5 bg-gray-50 mx-4 rounded-2xl mb-6">
          <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mb-3", bg)}>
            <Icon className={cn("h-8 w-8", color)} />
          </div>
          <p className={cn("text-4xl font-bold tabular-nums", amountColor(txn.transaction_type))}>
            {amountPrefix(txn.transaction_type)}${Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-gray-500 text-sm mt-1 capitalize">{txn.transaction_type}</p>
          <div className={cn("flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs font-semibold", status.cls)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-5 divide-y divide-gray-100 mb-6">
          <DetailRow icon={Hash}         label="Reference"  value={txn.reference_code} mono />
          <DetailRow icon={Calendar}     label="Date & Time" value={new Date(txn.created_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
          <DetailRow icon={FileText}     label="Description" value={txn.narration || "—"} />
          <DetailRow icon={CreditCard}   label="Type"        value={txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1)} />
          {txn.sender_account_id   && <DetailRow icon={ArrowUpRight}   label="From Account" value={`...${txn.sender_account_id.slice(-8)}`}   mono />}
          {txn.receiver_account_id && <DetailRow icon={ArrowDownLeft}  label="To Account"   value={`...${txn.receiver_account_id.slice(-8)}`} mono />}
        </div>

        {/* Actions */}
        <div className="px-5 pb-10 flex gap-3">
          <button
            onClick={handleDownloadReceipt}
            className="flex-1 flex items-center justify-center gap-2 bg-[#117ACA] text-white font-semibold py-3.5 rounded-2xl hover:bg-[#0f6ab5] transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Receipt
          </button>
          <button
            onClick={handleShare}
            className={cn(
              "h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-200 flex-shrink-0",
              copied
                ? "bg-green-500 scale-95"
                : "bg-gray-100 hover:bg-gray-200"
            )}
            title={copied ? "Copied!" : "Copy receipt details"}
          >
            {copied
              ? <CheckCircle2 className="h-5 w-5 text-white" />
              : <Share2 className="h-5 w-5 text-gray-600" />}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Detail Row ────────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between py-3.5">
    <div className="flex items-center gap-3 text-gray-500">
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
    <span className={cn("text-sm font-semibold text-gray-900 text-right max-w-[55%] break-all", mono && "font-mono text-xs")}>
      {value}
    </span>
  </div>
);

export default Transactions;

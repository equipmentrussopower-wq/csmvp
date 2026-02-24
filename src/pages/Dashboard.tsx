import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {MainDashboardLayout } from "@/components/MainDashboardLayout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ChevronRight, Plus, CreditCard, FileText, ArrowLeftRight, X,
  PiggyBank, Tag, ExternalLink, Gift, Percent, ShoppingBag, Zap
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

// ── Action card data ──────────────────────────────────────────────────────────
const ACTION_CARDS = [
  { id: "apple-pay", icon: CreditCard, label: "Set Up\nApple Pay" },
  { id: "deposit", icon: FileText, label: "Deposit\nChecks" },
  { id: "transfer", icon: ArrowLeftRight, label: "Account\nTransfer" },
  { id: "bill", icon: CreditCard, label: "Pay a bill" },
];

// ── Offers data ───────────────────────────────────────────────────────────────
const ALL_OFFERS = [
  {
    id: "cards",
    label: "Chase Cards",
    description: "Earn 5% cash back on select categories",
    badge: "5% back",
    badgeColor: "bg-blue-100 text-[#0E76C7]",
    tile: (
      <div className="flex flex-col items-center gap-1">
        <div className="h-8 w-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-sm" />
        <span className="text-[10px] font-semibold text-gray-600">Cards</span>
      </div>
    ),
    tileBg: "bg-gray-100",
    tileBorder: true,
  },
  {
    id: "office-depot",
    label: "Office Depot",
    description: "Save 20% on office supplies & furniture",
    badge: "20% off",
    badgeColor: "bg-red-100 text-red-600",
    tile: <span className="text-white font-black text-lg italic leading-none">Office<br />DEPOT.</span>,
    tileBg: "bg-[#CC0000]",
    tileBorder: false,
  },
  {
    id: "nfl",
    label: "NFL Shop",
    description: "Get $25 off your next NFL merchandise order",
    badge: "$25 off",
    badgeColor: "bg-gray-100 text-gray-700",
    tile: <span className="text-white font-black text-xl tracking-tight">NFL</span>,
    tileBg: "bg-[#1a1a2e]",
    tileBorder: false,
  },
  {
    id: "dell",
    label: "Dell Technologies",
    description: "Up to 15% off laptops, monitors & accessories",
    badge: "15% off",
    badgeColor: "bg-blue-50 text-[#007DB8]",
    tile: <span className="text-[#007DB8] font-black text-lg border-2 border-[#007DB8] rounded-full px-2 py-0.5">DELL</span>,
    tileBg: "bg-white",
    tileBorder: true,
  },
  {
    id: "amazon",
    label: "Amazon",
    description: "3% cash back on all Amazon purchases",
    badge: "3% back",
    badgeColor: "bg-orange-100 text-orange-600",
    tile: <span className="text-[#FF9900] font-black text-xl">a</span>,
    tileBg: "bg-[#232F3E]",
    tileBorder: false,
  },
  {
    id: "starbucks",
    label: "Starbucks",
    description: "Earn double stars on every purchase",
    badge: "2x stars",
    badgeColor: "bg-green-100 text-green-700",
    tile: <span className="text-white font-black text-sm">★</span>,
    tileBg: "bg-[#00704A]",
    tileBorder: false,
  },
];

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<typeof ALL_OFFERS[0] | null>(null);

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

  const visibleCards = ACTION_CARDS.filter((c) => !dismissed.includes(c.id));

  if (loading) {
    return (
      <MainDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-[#0E76C7] border-t-transparent rounded-full" />
        </div>
      </MainDashboardLayout>
    );
  }

  return (
    <MainDashboardLayout>
      <div className="space-y-5">
        {/* ── Horizontal Action Cards (on blue bg) ── */}
        <div
          className="flex gap-3 px-4 bg-[#0E76C7] overflow-x-auto pt-4 pb-1 scrollbar-hide"
          style={{
            height: "200px",
            // Removed zIndex: -1 to prevent it from disappearing behind the page background
          }}
        >
          {visibleCards.map(({ id, icon: Icon, label }) => (
            <div
              key={id}
              onClick={() => {
                if (id === "transfer") navigate("/transfer");
                if (id === "deposit" || id === "bill") navigate("/accounts");
              }}
              style={{
                height: "100px"
              }}
              className="relative flex-shrink-0 w-[100px] bg-[#2982CF] backdrop-blur-sm border border-white/30 rounded-2xl p-3 cursor-pointer hover:bg-white/30 transition-colors"
            >
              <div className="h-5 w-5 rounded-lg flex items-center justify-center mb-4 mt-1">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-white text-xs font-semibold leading-tight whitespace-pre-line">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Accounts Card ── */}
        <div
          className="bg-white mx-4 rounded-3xl shadow-xl overflow-hidden"
          style={{
            marginTop: "-30px", // Increased negative margin for better overlap
            zIndex: 10,          // High enough to be on top
            position: "relative" // Crucial for zIndex to work
          }}
        >
          <div className="px-5 pt-5 pb-2">
            <h2 className="text-xl font-bold text-gray-900">Accounts</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {accounts.length === 0 ? (
              <div className="py-12 px-5 text-center text-gray-400">
                <PiggyBank className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500">No accounts yet</p>
                <p className="text-xs mt-1">Your accounts will appear here after KYC approval.</p>
              </div>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => navigate("/accounts")}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div>
                    <p className="text-[#0E76C7] font-bold text-sm uppercase tracking-wide flex items-center gap-0.5 group-hover:underline">
                      {account.account_type === "checking" ? "TOTAL CHECKING" : "CHASE SAVINGS"}
                      <ChevronRight className="h-4 w-4" />
                    </p>
                    <p className="text-gray-500 text-sm mt-0.5">** {account.account_number.slice(-4)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-semibold text-gray-900 tabular-nums">
                      ${Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <div className="h-7 w-px bg-gray-200" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        {/* ── Chase Offers ── */}
        <div className="space-y-3 mx-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chase offers</h2>
              <p className="text-sm text-gray-500">Add deals, shop and get money back.</p>
            </div>
            <button
              onClick={() => setShowOffers(true)}
              className="text-[#0E76C7] font-semibold text-sm flex items-center gap-0.5 hover:underline"
            >
              All offers <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {ALL_OFFERS.slice(0, 4).map((offer) => (
              <button
                key={offer.id}
                onClick={() => setSelectedOffer(offer)}
                className={cn(
                  "flex-shrink-0 w-24 h-16 rounded-2xl flex items-center justify-center overflow-hidden hover:scale-105 transition-transform shadow-sm active:scale-95",
                  offer.tileBg,
                  offer.tileBorder && "border border-gray-200"
                )}
              >
                {offer.tile}
              </button>
            ))}
          </div>
        </div>

        {/* ── Invest with J.P. Morgan ── */}
        <div
          onClick={() => window.open("https://www.jpmorgan.com/wealth-management", "_blank")}
          className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group mb-4"
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">Invest with J.P. Morgan</h2>
            <p className="text-sm text-gray-500 mt-0.5 max-w-xs">
              Work with an advisor, invest online and access market insights
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-3" />
        </div>

      </div>

      {/* ── All Offers Sheet ── */}
      {showOffers && (
        <OffersSheet
          offers={ALL_OFFERS}
          onClose={() => setShowOffers(false)}
          onSelect={(offer) => { setShowOffers(false); setSelectedOffer(offer); }}
        />
      )}

      {/* ── Single Offer Detail ── */}
      {selectedOffer && (
        <OfferDetail offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
      )}
    </MainDashboardLayout>
  );
};

// ── All Offers Sheet ──────────────────────────────────────────────────────────
const OffersSheet = ({
  offers,
  onClose,
  onSelect,
}: {
  offers: typeof ALL_OFFERS;
  onClose: () => void;
  onSelect: (o: typeof ALL_OFFERS[0]) => void;
}) => (
  <>
    <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Chase Offers</h2>
          <p className="text-sm text-gray-500">Tap an offer to add it to your card</p>
        </div>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="px-5 pb-10 space-y-3">
        {offers.map((offer) => (
          <button
            key={offer.id}
            onClick={() => onSelect(offer)}
            className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors text-left group border border-transparent hover:border-blue-100"
          >
            {/* Mini tile */}
            <div className={cn(
              "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm",
              offer.tileBg,
              offer.tileBorder && "border border-gray-200"
            )}>
              {offer.tile}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{offer.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{offer.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", offer.badgeColor)}>
                {offer.badge}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#0E76C7] transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  </>
);

// ── Single Offer Detail Sheet ─────────────────────────────────────────────────
const OfferDetail = ({
  offer,
  onClose,
}: {
  offer: typeof ALL_OFFERS[0];
  onClose: () => void;
}) => (
  <>
    <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl">
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between px-5 pt-2 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Offer Details</h2>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center py-8 px-5 bg-gray-50 mx-4 rounded-2xl mb-6">
        <div className={cn(
          "h-20 w-20 rounded-2xl flex items-center justify-center mb-4 shadow-md overflow-hidden",
          offer.tileBg,
          offer.tileBorder && "border border-gray-200"
        )}>
          {offer.tile}
        </div>
        <h3 className="text-xl font-bold text-gray-900">{offer.label}</h3>
        <span className={cn("mt-2 text-sm font-bold px-3 py-1 rounded-full", offer.badgeColor)}>
          {offer.badge}
        </span>
        <p className="text-sm text-gray-500 text-center mt-3 max-w-xs">{offer.description}</p>
      </div>

      {/* Info rows */}
      <div className="px-5 divide-y divide-gray-100 mb-6">
        <div className="flex items-center gap-3 py-3.5">
          <Tag className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Offer</span>
          <span className="ml-auto text-sm font-semibold text-gray-900">{offer.badge}</span>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <Gift className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Merchant</span>
          <span className="ml-auto text-sm font-semibold text-gray-900">{offer.label}</span>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <Zap className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Eligible cards</span>
          <span className="ml-auto text-sm font-semibold text-gray-900">All Chase cards</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10">
        <button className="w-full bg-[#0E76C7] text-white font-bold py-4 rounded-2xl hover:bg-[#0f6ab5] transition-colors flex items-center justify-center gap-2">
          <Percent className="h-5 w-5" />
          Add Offer to Card
        </button>
      </div>
    </div>
  </>
);

// ── Offer tile helper ─────────────────────────────────────────────────────────
const OfferTile = ({
  children,
  bg,
  border,
}: {
  children: React.ReactNode;
  bg: string;
  border?: boolean;
}) => (
  <div
    className={cn(
      "flex-shrink-0 w-24 h-16 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm",
      bg,
      border && "border border-gray-200"
    )}
  >
    {children}
  </div>
);

export default Dashboard;

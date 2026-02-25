import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hashPin } from "@/lib/crypto";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    ChevronLeft, Lock, KeyRound, Eye, EyeOff,
    CheckCircle2, XCircle, ShieldCheck
} from "lucide-react";
import ChaseLogo from "@/components/ChaseLogo";

const ChangePin = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const pinMatch = newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin;
    const pinMismatch = newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin;

    const handleSave = async () => {
        if (!pinMatch || !user) return;
        setLoading(true);
        try {
            const pinHash = await hashPin(newPin);
            const { error } = await supabase
                .from("user_pins")
                .upsert({ user_id: user.id, pin_hash: pinHash }, { onConflict: "user_id" });
            if (error) throw error;
            setSuccess(true);
            toast({ title: "PIN updated successfully ✓" });
        } catch (err: any) {
            toast({ title: "Failed to update PIN", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans">
            {/* ── Header ── */}
            <div className="bg-[#0E76C7] px-4 pt-4 pb-16 text-white">
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <ChaseLogo
                        className="h-6"
                        style={{ filter: "brightness(0) invert(1)", width: "100px" }}
                    />
                    <div className="w-10" />
                </div>

                <div className="text-center pb-2">
                    <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
                        <KeyRound className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Change Transaction PIN</h1>
                    <p className="text-white/70 text-sm mt-1">
                        Update your 4-digit security PIN
                    </p>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="px-4 -mt-8 relative z-10 space-y-4">
                {success ? (
                    /* ── Success State ── */
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center gap-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">PIN Updated!</h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Your transaction PIN has been changed successfully.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/profile")}
                            className="mt-2 w-full h-13 py-4 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] transition-colors shadow-lg shadow-[#0E76C7]/25"
                        >
                            Back to Profile
                        </button>
                    </div>
                ) : (
                    /* ── Form ── */
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Security notice */}
                        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#0E76C7] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[#0E76C7] font-medium leading-relaxed">
                                Your PIN is used to authorise all wire transfers. Keep it private and never share it with anyone.
                            </p>
                        </div>

                        <div className="px-5 py-6 space-y-5">
                            {/* New PIN */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    New PIN
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showNewPin ? "text" : "password"}
                                        value={newPin}
                                        onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        placeholder="● ● ● ●"
                                        maxLength={4}
                                        inputMode="numeric"
                                        className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-gray-200 text-lg font-mono tracking-[0.6em] text-center focus:outline-none focus:ring-2 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7] bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPin(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {/* PIN strength dots */}
                                <div className="flex gap-2 justify-center mt-2">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full transition-all duration-200",
                                                i < newPin.length ? "bg-[#0E76C7] scale-110" : "bg-gray-200"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Confirm PIN */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Confirm New PIN
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showConfirmPin ? "text" : "password"}
                                        value={confirmPin}
                                        onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        placeholder="● ● ● ●"
                                        maxLength={4}
                                        inputMode="numeric"
                                        className={cn(
                                            "w-full pl-10 pr-12 py-3.5 rounded-xl border text-lg font-mono tracking-[0.6em] text-center focus:outline-none focus:ring-2 bg-white transition-colors",
                                            pinMismatch
                                                ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                                                : pinMatch
                                                    ? "border-green-400 focus:ring-green-200 focus:border-green-500"
                                                    : "border-gray-200 focus:ring-[#0E76C7]/30 focus:border-[#0E76C7]"
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPin(v => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Match feedback */}
                                {pinMismatch && (
                                    <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                                        <XCircle className="w-3.5 h-3.5" /> PINs do not match
                                    </p>
                                )}
                                {pinMatch && (
                                    <p className="text-xs text-green-600 flex items-center gap-1.5 mt-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> PINs match — ready to save
                                    </p>
                                )}
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={!pinMatch || loading}
                                className="w-full h-14 bg-[#0E76C7] text-white font-bold rounded-2xl hover:bg-[#0f6ab5] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0E76C7]/25 mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </span>
                                ) : (
                                    <><KeyRound className="w-5 h-5" /> Save New PIN</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangePin;

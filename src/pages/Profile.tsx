import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { hashPin } from "@/lib/crypto";
import {
    User, Phone, MapPin, Lock, LogOut, ChevronRight,
    Shield, Bell, HelpCircle, FileText, CheckCircle2, XCircle,
    CreditCard, Eye, EyeOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Profile = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Profile state
    const [phone, setPhone] = useState(profile?.phone ?? "");
    const [address, setAddress] = useState(profile?.address ?? "");
    const [profileLoading, setProfileLoading] = useState(false);

    // PIN state
    const [showPinSection, setShowPinSection] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinLoading, setPinLoading] = useState(false);

    const initial = profile?.full_name?.charAt(0)?.toUpperCase() || "U";
    const pinMatch = newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin;
    const pinMismatch = newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin;

    const handleSaveProfile = async () => {
        if (!user) return;
        setProfileLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ phone, address })
                .eq("user_id", user.id);
            if (error) throw error;
            toast({ title: "Profile updated successfully ✓" });
        } catch (err: any) {
            toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSavePin = async () => {
        if (!pinMatch || !user) return;
        setPinLoading(true);
        try {
            const pinHash = await hashPin(newPin);
            const { error } = await supabase.from("user_pins").upsert({ user_id: user.id, pin_hash: pinHash });
            if (error) throw error;
            toast({ title: "PIN updated successfully ✓" });
            setNewPin(""); setConfirmPin(""); setShowPinSection(false);
        } catch (err: any) {
            toast({ title: "Failed to update PIN", description: err.message, variant: "destructive" });
        } finally {
            setPinLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    return (
        <DashboardLayout>
            <div className="px-4 pt-4 pb-10 space-y-5">

                {/* ── Avatar + Name ── */}
                <div className="flex flex-col items-center py-8 bg-white rounded-3xl shadow-sm">
                    <div className="h-20 w-20 rounded-full bg-[#117ACA] flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-md">
                        {initial}
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">{profile?.full_name || "Account Holder"}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
                    <span className="mt-3 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        Active Account
                    </span>
                </div>

                {/* ── Contact Info ── */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 pt-4 pb-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contact Information</h2>
                    </div>
                    <div className="px-5 pb-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" /> Full Name
                            </Label>
                            <Input value={profile?.full_name ?? ""} disabled className="bg-gray-50 text-gray-500 border-gray-100" />
                            <p className="text-[11px] text-gray-400">Name cannot be changed. Contact support if needed.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" /> Phone Number
                            </Label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                                className="border-gray-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> Address
                            </Label>
                            <Input
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="123 Main St, City, State"
                                className="border-gray-200"
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={profileLoading}
                            className="w-full bg-[#117ACA] text-white font-semibold py-3 rounded-xl hover:bg-[#0f6ab5] transition-colors disabled:opacity-60"
                        >
                            {profileLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* ── Quick Links ── */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                    <ProfileRow
                        icon={Lock}
                        iconBg="bg-blue-50"
                        iconColor="text-[#117ACA]"
                        label="Transaction PIN"
                        sublabel="Update your 4-digit transfer PIN"
                        onClick={() => setShowPinSection((v) => !v)}
                    />
                    <ProfileRow
                        icon={Shield}
                        iconBg="bg-purple-50"
                        iconColor="text-purple-600"
                        label="Security & KYC"
                        sublabel="View your verification status"
                        onClick={() => navigate("/kyc")}
                    />
                    <ProfileRow
                        icon={Bell}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        label="Notifications"
                        sublabel="Manage alerts and preferences"
                        onClick={() => navigate("/notifications")}
                    />
                    <ProfileRow
                        icon={FileText}
                        iconBg="bg-green-50"
                        iconColor="text-green-600"
                        label="Statements"
                        sublabel="Download account statements"
                        onClick={() => navigate("/transactions")}
                    />
                    <ProfileRow
                        icon={HelpCircle}
                        iconBg="bg-gray-100"
                        iconColor="text-gray-500"
                        label="Help & Support"
                        sublabel="FAQs, contact us"
                        onClick={() => navigate("/help")}
                    />
                </div>

                {/* ── PIN Section (expandable) ── */}
                {showPinSection && (
                    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-[#117ACA]" /> Update Transaction PIN
                        </h2>
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-500">New PIN</Label>
                            <div className="flex justify-center">
                                <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-500">Confirm PIN</Label>
                            <div className="flex justify-center">
                                <InputOTP maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                        {pinMismatch && (
                            <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                                <XCircle className="h-4 w-4" /> PINs do not match
                            </p>
                        )}
                        {pinMatch && (
                            <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> PINs match
                            </p>
                        )}
                        <button
                            onClick={handleSavePin}
                            disabled={pinLoading || !pinMatch}
                            className="w-full bg-[#117ACA] text-white font-semibold py-3 rounded-xl hover:bg-[#0f6ab5] transition-colors disabled:opacity-50"
                        >
                            {pinLoading ? "Saving..." : "Update PIN"}
                        </button>
                    </div>
                )}

                {/* ── Sign Out ── */}
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-100 text-red-500 font-semibold hover:bg-red-50 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>

            </div>
        </DashboardLayout>
    );
};

// ── Row helper ────────────────────────────────────────────────────────────────
const ProfileRow = ({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    sublabel,
    onClick,
}: {
    icon: any;
    iconBg: string;
    iconColor: string;
    label: string;
    sublabel: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
    >
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
    </button>
);

export default Profile;

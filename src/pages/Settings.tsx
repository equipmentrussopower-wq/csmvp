import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, XCircle, User, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "chase_salt_2026");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const Settings = () => {
    const { user, profile } = useAuth();
    const { toast } = useToast();

    // PIN state
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinLoading, setPinLoading] = useState(false);

    // Profile state
    const [phone, setPhone] = useState(profile?.phone ?? "");
    const [address, setAddress] = useState(profile?.address ?? "");
    const [profileLoading, setProfileLoading] = useState(false);

    const handleSavePin = async () => {
        if (newPin.length !== 4) {
            toast({ title: "PIN must be 4 digits", variant: "destructive" });
            return;
        }
        if (newPin !== confirmPin) {
            toast({ title: "PINs do not match", variant: "destructive" });
            return;
        }
        if (!user) return;

        setPinLoading(true);
        try {
            const pinHash = await hashPin(newPin);
            const { error } = await supabase.from("user_pins").upsert({
                user_id: user.id,
                pin_hash: pinHash,
            });
            if (error) throw error;
            toast({ title: "PIN updated successfully" });
            setNewPin("");
            setConfirmPin("");
        } catch (err: any) {
            toast({ title: "Failed to update PIN", description: err.message, variant: "destructive" });
        } finally {
            setPinLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setProfileLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ phone, address })
                .eq("user_id", user.id);
            if (error) throw error;
            toast({ title: "Profile updated successfully" });
        } catch (err: any) {
            toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
        } finally {
            setProfileLoading(false);
        }
    };

    const pinMatch = newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin;
    const pinMismatch = newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin;

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account preferences</p>
                </div>

                {/* Profile Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-[#117ACA]" />
                            Profile Information
                        </CardTitle>
                        <CardDescription>Update your contact details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={profile?.full_name ?? ""} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">Name cannot be changed. Contact support if needed.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                <Phone className="h-3.5 w-3.5 inline mr-1" />
                                Phone Number
                            </Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">
                                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                                Address
                            </Label>
                            <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="123 Main St, City, State"
                            />
                        </div>
                        <Button
                            onClick={handleSaveProfile}
                            disabled={profileLoading}
                            className="bg-[#117ACA] hover:bg-[#0e6ab0]"
                        >
                            {profileLoading ? "Saving..." : "Save Profile"}
                        </Button>
                    </CardContent>
                </Card>

                {/* PIN Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-[#117ACA]" />
                            Transaction PIN
                        </CardTitle>
                        <CardDescription>
                            Your 4-digit PIN is required to authorize all fund transfers. Keep it private.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>New PIN</Label>
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

                        <div className="space-y-3">
                            <Label>Confirm New PIN</Label>
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

                        <Button
                            className="w-full bg-[#117ACA] hover:bg-[#0e6ab0]"
                            onClick={handleSavePin}
                            disabled={pinLoading || !pinMatch}
                        >
                            {pinLoading ? "Saving..." : "Update PIN"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Settings;

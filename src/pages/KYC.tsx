import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import ChaseLogo from "@/components/ChaseLogo";
import { CheckCircle2, Clock, XCircle, ShieldCheck, User, FileText, Lock, Upload, Image as ImageIcon } from "lucide-react";
import { hashPin } from "@/lib/crypto";



type KycStep = "personal" | "identity" | "pin" | "submitted";

const KYC = () => {
    const { user, kycStatus, refreshAuth } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState<KycStep>("personal");
    const [loading, setLoading] = useState(false);

    // Sync step with KYC status on mount/change
    useEffect(() => {
        if (kycStatus === "pending") {
            setStep("submitted");
        } else if (kycStatus === "approved") {
            navigate("/dashboard");
        }
    }, [kycStatus, navigate]);

    // Personal info
    const [fullName, setFullName] = useState("");
    const [dob, setDob] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    // Identity
    const [idType, setIdType] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [idImage, setIdImage] = useState<File | null>(null);
    const [idImageUrl, setIdImageUrl] = useState("");

    // PIN
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    const handlePersonalNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !dob || !phone || !address) {
            toast({ title: "Please fill in all fields", variant: "destructive" });
            return;
        }
        setStep("identity");
    };

    const handleIdentityNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idType || !idNumber || !idImage) {
            toast({ title: "Please fill in all fields and upload an ID image", variant: "destructive" });
            return;
        }
        setStep("pin");
    };

    const handleSubmit = async () => {
        if (pin.length !== 4) {
            toast({ title: "PIN must be 4 digits", variant: "destructive" });
            return;
        }
        if (pin !== confirmPin) {
            toast({ title: "PINs do not match", variant: "destructive" });
            return;
        }
        if (!user) return;

        setLoading(true);
        try {
            let uploadedUrl = idImageUrl;

            // Upload image if present
            if (idImage) {
                const fileExt = idImage.name.split('.').pop();
                const fileName = `${user.id}/${Math.random()}.${fileExt}`;
                const { error: uploadError, data } = await supabase.storage
                    .from('kyc-documents')
                    .upload(fileName, idImage);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('kyc-documents')
                    .getPublicUrl(fileName);
                uploadedUrl = publicUrl;
            }

            // Submit KYC using upsert
            const { error: kycError } = await supabase.from("kyc_submissions").upsert({
                user_id: user.id,
                full_name: fullName,
                date_of_birth: dob,
                phone,
                address,
                id_type: idType,
                id_number: idNumber,
                id_image_url: uploadedUrl,
                status: "pending",
            }, { onConflict: "user_id" });

            if (kycError) throw kycError;

            // Save PIN hash
            const pinHash = await hashPin(pin);
            const { error: pinError } = await supabase.from("user_pins").upsert({
                user_id: user.id,
                pin_hash: pinHash,
            });

            if (pinError) throw pinError;

            // Update profile name
            await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);

            // Sync auth state
            await refreshAuth();

            setStep("submitted");
        } catch (err: any) {
            toast({ title: "Submission failed", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: "personal", label: "Personal Info", icon: User },
        { id: "identity", label: "Identity", icon: FileText },
        { id: "pin", label: "Set PIN", icon: Lock },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === step);

    if (step === "submitted") {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md text-center space-y-6">
                    <ChaseLogo className="h-10 w-auto text-gray-900 mx-auto" />
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 space-y-4">
                        <div className="flex justify-center">
                            <Clock className="h-16 w-16 text-[#0E76C7]" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Application Submitted</h2>
                        <p className="text-gray-500 leading-relaxed">
                            Your KYC application is under review. We'll notify you once it's approved — usually within 1 business day.
                            Your accounts will be created automatically upon approval.
                        </p>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-4 py-1">
                            Pending Review
                        </Badge>
                        <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => navigate("/dashboard")}
                        >
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <ChaseLogo className="h-10 w-auto text-gray-900 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">Account Verification</h1>
                    <p className="text-gray-500 text-sm">Complete your KYC to open your Chase accounts</p>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-2">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const isComplete = i < currentStepIndex;
                        const isCurrent = i === currentStepIndex;
                        return (
                            <div key={s.id} className="flex items-center gap-2">
                                <div
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isComplete
                                        ? "bg-green-100 text-green-700"
                                        : isCurrent
                                            ? "bg-[#0E76C7] text-white"
                                            : "bg-gray-100 text-gray-400"
                                        }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                        <Icon className="h-3.5 w-3.5" />
                                    )}
                                    {s.label}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`h-px w-6 ${i < currentStepIndex ? "bg-green-400" : "bg-gray-200"}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step 1: Personal Info */}
                {step === "personal" && (
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-[#0E76C7]" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>Tell us about yourself</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePersonalNext} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Legal Name</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="As it appears on your ID"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1 234 567 8900"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Residential Address</Label>
                                    <Input
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="123 Main St, City, State, ZIP"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-[#0E76C7] hover:bg-[#0e6ab0]">
                                    Continue
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Identity */}
                {step === "identity" && (
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[#0E76C7]" />
                                Identity Verification
                            </CardTitle>
                            <CardDescription>Provide a valid government-issued ID</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleIdentityNext} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>ID Type</Label>
                                    <Select value={idType} onValueChange={setIdType} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select ID type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="passport">Passport</SelectItem>
                                            <SelectItem value="drivers_license">Driver's License</SelectItem>
                                            <SelectItem value="national_id">National ID Card</SelectItem>
                                            <SelectItem value="state_id">State ID</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="idNumber">ID Number</Label>
                                    <Input
                                        id="idNumber"
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        placeholder="Enter your ID number"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Upload ID Photo</Label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 transition-colors hover:border-[#0E76C7]">
                                        {idImage ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                        <ImageIcon className="h-3 w-3 mr-1" /> Ready
                                                    </Badge>
                                                    <span className="text-sm truncate max-w-[150px]">{idImage.name}</span>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => setIdImage(null)}>Clear</Button>
                                            </div>
                                        ) : (
                                            <div className="relative group cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setIdImage(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="text-center py-2">
                                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2 transition-transform group-hover:-translate-y-1" />
                                                    <p className="text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                    <ShieldCheck className="h-4 w-4 inline mr-1" />
                                    Your information is encrypted and securely stored. We never share your data.
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("personal")}>
                                        Back
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-[#0E76C7] hover:bg-[#0e6ab0]">
                                        Continue
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Set PIN */}
                {step === "pin" && (
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-[#0E76C7]" />
                                Set Your Transaction PIN
                            </CardTitle>
                            <CardDescription>
                                Your 4-digit PIN will be required to authorize all transfers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Create PIN</Label>
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
                            </div>
                            <div className="space-y-3">
                                <Label>Confirm PIN</Label>
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
                            {pin.length === 4 && confirmPin.length === 4 && pin !== confirmPin && (
                                <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                                    <XCircle className="h-4 w-4" /> PINs do not match
                                </p>
                            )}
                            {pin.length === 4 && confirmPin.length === 4 && pin === confirmPin && (
                                <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> PINs match
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("identity")}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-1 bg-[#0E76C7] hover:bg-[#0e6ab0]"
                                    onClick={handleSubmit}
                                    disabled={loading || pin.length !== 4 || pin !== confirmPin}
                                >
                                    {loading ? "Submitting..." : "Submit Application"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default KYC;

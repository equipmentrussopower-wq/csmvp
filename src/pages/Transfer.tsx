import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Send, ShieldCheck, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TransferStep = "details" | "otp";

const Transfer = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [senderAccountId, setSenderAccountId] = useState("");
  const [receiverAccountNumber, setReceiverAccountNumber] = useState("");
  const [receiverAccountId, setReceiverAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<TransferStep>("details");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => setAccounts(data ?? []));
  }, [user]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Look up receiver by account number
      const { data: receiver, error: lookupError } = await supabase
        .from("accounts")
        .select("id")
        .eq("account_number", receiverAccountNumber)
        .maybeSingle();

      if (lookupError || !receiver) {
        throw new Error("Receiver account not found. Check the account number.");
      }

      if (receiver.id === senderAccountId) {
        throw new Error("Cannot transfer to the same account.");
      }

      setReceiverAccountId(receiver.id);

      // Request OTP
      const { data, error } = await supabase.functions.invoke("send-otp", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error("Failed to send OTP. Please try again.");

      // For demo purposes, show the OTP
      if (data?.demo_otp) {
        setDemoOtp(data.demo_otp);
      }

      setStep("otp");
      toast({ title: "OTP Sent", description: "A verification code has been sent to your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndTransfer = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          code: otpCode,
          sender_account_id: senderAccountId,
          receiver_account_id: receiverAccountId,
          amount: parseFloat(amount),
          narration: narration || null,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || "Verification failed. Please try again.");
      }

      toast({ title: "Transfer Successful", description: `$${parseFloat(amount).toFixed(2)} sent successfully.` });
      
      // Reset form
      setAmount("");
      setNarration("");
      setReceiverAccountNumber("");
      setReceiverAccountId("");
      setOtpCode("");
      setDemoOtp("");
      setStep("details");

      // Refresh accounts
      const { data: acctData } = await supabase.from("accounts").select("*").eq("user_id", user!.id).eq("status", "active");
      setAccounts(acctData ?? []);
    } catch (error: any) {
      toast({ title: "Transfer Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transfer Funds</h1>
          <p className="text-muted-foreground mt-1">Send money to another EduBank account</p>
        </div>

        {step === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                New Transfer
              </CardTitle>
              <CardDescription>All transfers require OTP verification for security.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select value={senderAccountId} onValueChange={setSenderAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_number} ({a.account_type}) — ${Number(a.balance).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <Label>Receiver Account Number</Label>
                  <Input
                    value={receiverAccountNumber}
                    onChange={(e) => setReceiverAccountNumber(e.target.value)}
                    placeholder="EB0000000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Narration (optional)</Label>
                  <Input
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="What's this for?"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !senderAccountId}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Sending OTP...
                    </>
                  ) : (
                    "Continue & Verify"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Verify Transfer
              </CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to your email to confirm this transfer of ${parseFloat(amount).toFixed(2)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {demoOtp && (
                <div className="bg-muted border border-border rounded-md p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Demo OTP (for testing)</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-primary">{demoOtp}</p>
                </div>
              )}

              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("details");
                    setOtpCode("");
                    setDemoOtp("");
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerifyAndTransfer}
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Transfer"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transfer;

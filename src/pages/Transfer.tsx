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
import { hashPin } from "@/lib/crypto";
import type { Tables } from "@/integrations/supabase/types";

type TransferStep = "details" | "pin";

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
  const [pin, setPin] = useState("");



  useEffect(() => {
    if (!user) return;
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => setAccounts(data ?? []));
  }, [user]);

  const handleProceedToPin = async (e: React.FormEvent) => {
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
      setStep("pin");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndTransfer = async () => {
    if (pin.length !== 4) return;
    setLoading(true);

    try {
      const pinHash = await hashPin(pin);
      const { data, error } = await supabase.rpc("transfer_with_pin", {
        p_sender_account_id: senderAccountId,
        p_receiver_account_id: receiverAccountId,
        p_amount: parseFloat(amount),
        p_pin_hash: pinHash,
        p_narration: narration || null,
      });

      if (error) throw error;

      toast({ title: "Transfer Successful", description: `$${parseFloat(amount).toFixed(2)} sent successfully.` });

      // Reset form
      setAmount("");
      setNarration("");
      setReceiverAccountNumber("");
      setReceiverAccountId("");
      setPin("");
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
              <form onSubmit={handleProceedToPin} className="space-y-4">
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
                    "Continue"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "pin" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Authorize Transfer
              </CardTitle>
              <CardDescription>
                Enter your 4-digit PIN to confirm this transfer of ${parseFloat(amount).toFixed(2)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("details");
                    setPin("");
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerifyAndTransfer}
                  disabled={loading || pin.length !== 4}
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

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShieldCheck, ShoppingBag, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

const Cards = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [cards, setCards] = useState<Tables<"cards">[]>([]);
    const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
    const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [cardCost, setCardCost] = useState(1230);
    const [selectedAccountId, setSelectedAccountId] = useState("");

    const fetchData = async () => {
        if (!user) return;
        const [c, a, s] = await Promise.all([
            supabase.from("cards").select("*").eq("user_id", user.id),
            supabase.from("accounts").select("*").eq("user_id", user.id).eq("status", "active"),
            supabase.from("platform_settings").select("*").eq("key", "debit_card_cost").single(),
        ]);

        setCards(c.data ?? []);
        setAccounts(a.data ?? []);
        if (s.data) setCardCost(parseInt(s.data.value));
        if (a.data && a.data.length > 0) setSelectedAccountId(a.data[0].id);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [user]);

    const handleRequestCard = async () => {
        if (!selectedAccountId) return;
        setRequesting(true);
        try {
            const { data, error } = await supabase.rpc("request_debit_card", {
                p_account_id: selectedAccountId,
                p_type: 'virtual'
            });

            if (error) throw error;

            toast({ title: "Application Submitted", description: "Your request has been received. Our team will contact you for payment and delivery." });
            fetchData();
        } catch (err: any) {
            toast({ title: "Request Failed", description: err.message, variant: "destructive" });
        } finally {
            setRequesting(false);
        }
    };

    const toggleDetails = (id: string) => {
        setShowDetails(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Debit Cards</h1>
                        <p className="text-muted-foreground mt-1">Manage your virtual and physical cards</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-[#0E76C7]" />
                </div>

                {cards.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardHeader>
                            <CardTitle>Activate Your Account</CardTitle>
                            <CardDescription>
                                You will need a debit card to activate your transfer functions and enable you to start making payments from your existing account balance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-[#0E76C7] mt-0.5" />
                                <div className="text-sm border-l-2 border-[#0E76C7] pl-3">
                                    <p className="font-semibold text-[#0E76C7]">Card Application Terms</p>
                                    <p className="mt-1">Cost of Debit card is <strong>${cardCost.toLocaleString()}</strong>.</p>
                                    <p className="mt-2">After application, the admin will reach out to you via your registered contact details to facilitate payment and linkage.</p>
                                    <p className="mt-2 text-xs text-muted-foreground italic">Note: You do not pay for the card directly on this platform.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Account to Link</label>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
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

                            <Button
                                className="w-full bg-[#0E76C7] hover:bg-[#0f6ab5]"
                                size="lg"
                                onClick={handleRequestCard}
                                disabled={requesting || !selectedAccountId}
                            >
                                {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                                Apply for Debit Card
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cards.map((c) => (
                            <Card key={c.id} className="overflow-hidden bg-gradient-to-br from-[#1e1e1e] to-[#3a3a3a] text-white border-none shadow-xl">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-medium opacity-70 capitalize">{c.type} Debit Card</CardTitle>
                                        <Badge variant="outline" className="text-white border-white/20 bg-white/10 uppercase text-[10px]">
                                            {c.status}
                                        </Badge>
                                    </div>
                                    <div className="h-8 w-12 bg-yellow-500/20 rounded-md flex items-center justify-center border border-yellow-500/30">
                                        <div className="w-6 h-4 bg-yellow-400/80 rounded" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <p className="text-2xl font-mono tracking-widest">
                                                {showDetails[c.id]
                                                    ? c.card_number.replace(/(\d{4})/g, '$1 ').trim()
                                                    : `**** **** **** ${c.card_number.slice(-4)}`
                                                }
                                            </p>
                                            <button onClick={() => toggleDetails(c.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                                {showDetails[c.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Expiry Date</p>
                                            <p className="font-mono">{new Date(c.expiry_date).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' })}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">CVV</p>
                                            <p className="font-mono">{showDetails[c.id] ? c.cvv : '***'}</p>
                                        </div>
                                        <div className="h-10 w-16 opacity-30">
                                            <svg viewBox="0 0 100 60" className="w-full h-full fill-white">
                                                <circle cx="35" cy="30" r="25" />
                                                <circle cx="65" cy="30" r="25" />
                                            </svg>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Cards;

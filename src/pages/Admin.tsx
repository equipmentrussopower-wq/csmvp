import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, CreditCard, ArrowLeftRight, RotateCcw, Snowflake, DollarSign } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Admin = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [transactions, setTransactions] = useState<Tables<"transactions">[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjust balance state
  const [adjustAccountId, setAdjustAccountId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdrawal">("deposit");
  const [adjustNarration, setAdjustNarration] = useState("");

  const fetchAll = async () => {
    const [p, a, t] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProfiles(p.data ?? []);
    setAccounts(a.data ?? []);
    setTransactions(t.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleStatus = async (accountId: string, newStatus: "active" | "frozen") => {
    const { error } = await supabase.rpc("admin_toggle_account_status", {
      p_account_id: accountId,
      p_status: newStatus,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Account ${newStatus}.` });
      fetchAll();
    }
  };

  const reverseTransaction = async (txnId: string) => {
    const { error } = await supabase.rpc("admin_reverse_transaction", { p_transaction_id: txnId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transaction Reversed", description: "Balances have been restored." });
      fetchAll();
    }
  };

  const handleAdjust = async () => {
    const { error } = await supabase.rpc("admin_adjust_balance", {
      p_account_id: adjustAccountId,
      p_amount: parseFloat(adjustAmount),
      p_type: adjustType,
      p_narration: adjustNarration || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Account ${adjustType} completed.` });
      setAdjustAmount("");
      setAdjustNarration("");
      fetchAll();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Bank Operations Console</p>
          </div>
        </div>

        <Tabs defaultValue="customers">
          <TabsList>
            <TabsTrigger value="customers" className="gap-1"><Users className="h-4 w-4" />Customers</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1"><CreditCard className="h-4 w-4" />Accounts</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><ArrowLeftRight className="h-4 w-4" />Transactions</TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader><CardTitle>All Customers ({profiles.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell>{p.phone || "—"}</TableCell>
                        <TableCell>{p.address || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Accounts ({accounts.length})</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm"><DollarSign className="h-4 w-4 mr-1" />Credit/Debit</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Credit / Debit Account</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Account</Label>
                          <Select value={adjustAccountId} onValueChange={setAdjustAccountId}>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.account_number} — ${Number(a.balance).toFixed(2)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "deposit" | "withdrawal")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deposit">Credit (Deposit)</SelectItem>
                              <SelectItem value="withdrawal">Debit (Withdrawal)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input type="number" min="0.01" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Narration</Label>
                          <Input value={adjustNarration} onChange={(e) => setAdjustNarration(e.target.value)} placeholder="Admin adjustment" />
                        </div>
                        <Button className="w-full" onClick={handleAdjust} disabled={!adjustAccountId || !adjustAmount}>
                          Process
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono">{a.account_number}</TableCell>
                        <TableCell className="capitalize">{a.account_type}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "active" ? "default" : "destructive"}>{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">${Number(a.balance).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={a.status === "active" ? "destructive" : "default"}
                            onClick={() => toggleStatus(a.id, a.status === "active" ? "frozen" : "active")}
                          >
                            <Snowflake className="h-3 w-3 mr-1" />
                            {a.status === "active" ? "Freeze" : "Unfreeze"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader><CardTitle>All Transactions ({transactions.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.reference_code}</TableCell>
                        <TableCell className="capitalize">{t.transaction_type}</TableCell>
                        <TableCell className="font-semibold">${Number(t.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "completed" ? "default" : t.status === "reversed" ? "destructive" : "secondary"}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {t.status === "completed" && (
                            <Button size="sm" variant="outline" onClick={() => reverseTransaction(t.id)}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reverse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;

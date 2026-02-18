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
import { Shield, Users, CreditCard, ArrowLeftRight, RotateCcw, Snowflake, DollarSign, CheckCircle, XCircle, FileText, Eye, Info, PlusCircle, Bell, Send, Trash2, Megaphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const Admin = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [transactions, setTransactions] = useState<Tables<"transactions">[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<Tables<"kyc_submissions">[]>([]);
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification form state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success" | "warning" | "alert">("info");
  const [notifTarget, setNotifTarget] = useState("all"); // "all" or a user_id
  const [notifSending, setNotifSending] = useState(false);

  // Adjust balance state
  const [adjustAccountId, setAdjustAccountId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdrawal">("deposit");
  const [adjustNarration, setAdjustNarration] = useState("");
  const [selectedUserForMock, setSelectedUserForMock] = useState<Tables<"profiles"> | null>(null);

  const fetchAll = async () => {
    const [p, a, t, k, n] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("kyc_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setProfiles(p.data ?? []);
    setAccounts(a.data ?? []);
    setTransactions(t.data ?? []);
    setKycSubmissions(k.data ?? []);
    setNotifications(n.data ?? []);
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

  const handleApproveKyc = async (userId: string) => {
    const { error } = await supabase.rpc("admin_approve_kyc", { p_user_id: userId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "KYC Approved", description: "User accounts have been created." });
      fetchAll();
    }
  };

  const handleRejectKyc = async (userId: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    const { error } = await supabase.rpc("admin_reject_kyc", { p_user_id: userId, p_reason: reason });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "KYC Rejected", description: "Submission marked as rejected." });
      fetchAll();
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setNotifSending(true);
    try {
      const payload: TablesInsert<"notifications"> = { 
        title: notifTitle.trim(), 
        body: notifBody.trim(), 
        type: notifType,
        user_id: notifTarget === "all" ? null : notifTarget
      };
      const { error } = await supabase.from("notifications").insert(payload);
      if (error) throw error;
      toast({ title: "Notification sent ✓", description: notifTarget === "all" ? "Broadcast to all users" : "Sent to selected user" });
      setNotifTitle(""); setNotifBody(""); setNotifType("info"); setNotifTarget("all");
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setNotifSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
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
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="customers" className="gap-1"><Users className="h-4 w-4" />Customers</TabsTrigger>
            <TabsTrigger value="kyc" className="gap-1"><FileText className="h-4 w-4" />KYC Submissions</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1"><CreditCard className="h-4 w-4" />Accounts</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><ArrowLeftRight className="h-4 w-4" />Transactions</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell>{p.phone || "—"}</TableCell>
                        <TableCell>{p.address || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserForMock(p);
                                  const userAccount = accounts.find(a => a.user_id === p.user_id);
                                  if (userAccount) setAdjustAccountId(userAccount.id);
                                }}
                              >
                                <PlusCircle className="h-3 w-3 mr-1" /> Mock Txn
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Mock Transaction for {p.full_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Select Account</Label>
                                  <Select value={adjustAccountId} onValueChange={setAdjustAccountId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts
                                        .filter((a) => a.user_id === p.user_id)
                                        .map((a) => (
                                          <SelectItem key={a.id} value={a.id}>
                                            {a.account_number} ({a.account_type}) — ${Number(a.balance).toFixed(2)}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Transaction Type</Label>
                                  <Select
                                    value={adjustNarration}
                                    onValueChange={(v) => {
                                      setAdjustNarration(v);
                                      // Determine if it's a deposit or withdrawal based on common names
                                      const isDebit = v.toLowerCase().includes("fee") ||
                                        v.toLowerCase().includes("withdrawal") ||
                                        v.toLowerCase().includes("deduction") ||
                                        v.toLowerCase().includes("purchase");
                                      setAdjustType(isDebit ? "withdrawal" : "deposit");
                                    }}
                                  >
                                    <SelectTrigger><SelectValue placeholder="Select type of transaction" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Salary Payment">Salary Payment</SelectItem>
                                      <SelectItem value="Interest Credit">Interest Credit</SelectItem>
                                      <SelectItem value="Refund">Refund</SelectItem>
                                      <SelectItem value="Bonus">Bonus</SelectItem>
                                      <SelectItem value="Account Maintenance Fee">Account Maintenance Fee</SelectItem>
                                      <SelectItem value="ATM Withdrawal">ATM Withdrawal</SelectItem>
                                      <SelectItem value="Online Purchase">Online Purchase</SelectItem>
                                      <SelectItem value="Tax Deduction">Tax Deduction</SelectItem>
                                      <SelectItem value="Custom">-- Custom Transaction --</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {adjustNarration === "Custom" && (
                                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label>Custom Narration</Label>
                                    <Input
                                      placeholder="e.g. Dividend Payment, Insurance Premium"
                                      onChange={(e) => setAdjustNarration(e.target.value)}
                                    />
                                    <div className="flex gap-4 pt-2">
                                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                          type="radio"
                                          name="type"
                                          checked={adjustType === "deposit"}
                                          onChange={() => setAdjustType("deposit")}
                                        /> Credit (+)
                                      </label>
                                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                          type="radio"
                                          name="type"
                                          checked={adjustType === "withdrawal"}
                                          onChange={() => setAdjustType("withdrawal")}
                                        /> Debit (-)
                                      </label>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label>Amount ($)</Label>
                                  <Input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="e.g. 1500.00"
                                  />
                                </div>
                                <Button
                                  className="w-full bg-[#117ACA] mt-2"
                                  onClick={handleAdjust}
                                  disabled={!adjustAccountId || !adjustAmount || !adjustNarration}
                                >
                                  Process {adjustType === 'deposit' ? 'Credit' : 'Debit'} Transaction
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card>
              <CardHeader><CardTitle>Pending KYC Reviews</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>ID Type</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycSubmissions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-4">No submissions found.</TableCell></TableRow>
                    ) : kycSubmissions.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.full_name}</TableCell>
                        <TableCell className="capitalize">{k.id_type.replace("_", " ")}</TableCell>
                        <TableCell className="font-mono">{k.id_number}</TableCell>
                        <TableCell>
                          <Badge variant={k.status === "approved" ? "default" : k.status === "rejected" ? "destructive" : "secondary"}>
                            {k.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(k.submitted_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>KYC Details — {k.full_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground font-medium">Full Legal Name</p>
                                      <p className="font-semibold">{k.full_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-medium">Date of Birth</p>
                                      <p>{new Date(k.date_of_birth).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-medium">Phone Number</p>
                                      <p>{k.phone}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground font-medium">ID Type</p>
                                      <p className="capitalize">{k.id_type.replace("_", " ")}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground font-medium">Residential Address</p>
                                      <p>{k.address}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground font-medium">ID Number</p>
                                      <p className="font-mono bg-gray-50 p-2 rounded border">{k.id_number}</p>
                                    </div>
                                    {k.id_image_url && (
                                      <div className="col-span-2">
                                        <p className="text-muted-foreground font-medium mb-2">Identity Document Image</p>
                                        <div className="rounded-lg border overflow-hidden bg-gray-50">
                                          <img
                                            src={k.id_image_url}
                                            alt="Identity Document"
                                            className="w-full h-auto max-h-60 object-contain hover:scale-105 transition-transform cursor-zoom-in"
                                            onClick={() => window.open(k.id_image_url, '_blank')}
                                          />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">Click image to view full size</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 pt-4 border-t">
                                    {k.status === "pending" ? (
                                      <>
                                        <Button className="flex-1" onClick={() => handleApproveKyc(k.user_id)}>
                                          Approve Submission
                                        </Button>
                                        <Button variant="destructive" onClick={() => handleRejectKyc(k.user_id)}>
                                          Reject
                                        </Button>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Info className="h-4 w-4" />
                                        This submission is already {k.status}.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {k.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApproveKyc(k.user_id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectKyc(k.user_id)}>
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
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
          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="space-y-5">
              {/* Send form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-[#117ACA]" />
                    Send Notification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="e.g. Account Update, Security Alert"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={notifType} onValueChange={(v) => setNotifType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">ℹ️ Info</SelectItem>
                          <SelectItem value="success">✅ Success</SelectItem>
                          <SelectItem value="warning">⚠️ Warning</SelectItem>
                          <SelectItem value="alert">🚨 Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target User</Label>
                    <Select value={notifTarget} onValueChange={setNotifTarget}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">📢 Broadcast — All Users</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.full_name} ({p.phone || "no phone"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      placeholder="Write the notification message here..."
                      rows={3}
                    />
                  </div>
                  <Button
                    className="bg-[#117ACA] hover:bg-[#0f6ab5] gap-2"
                    onClick={handleSendNotification}
                    disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                  >
                    <Send className="h-4 w-4" />
                    {notifSending ? "Sending..." : "Send Notification"}
                  </Button>
                </CardContent>
              </Card>

              {/* Sent notifications list */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Sent Notifications ({notifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notifications sent yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notifications.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell className="font-semibold">{n.title}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{n.body}</TableCell>
                            <TableCell>
                              <Badge variant={n.type === "alert" ? "destructive" : n.type === "warning" ? "secondary" : "default"}>
                                {n.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {n.user_id ? `${n.user_id.slice(0, 8)}…` : "📢 All users"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(n.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteNotification(n.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;

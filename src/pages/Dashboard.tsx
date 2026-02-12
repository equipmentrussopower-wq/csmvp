import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, ArrowDownLeft, Wallet } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Tables<"accounts">[]>([]);
  const [transactions, setTransactions] = useState<Tables<"transactions">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [acctRes, txnRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setAccounts(acctRes.data ?? []);
      setTransactions(txnRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const createAccount = async (type: "savings" | "current") => {
    if (!user) return;
    await supabase.from("accounts").insert({ user_id: user.id, account_type: type, account_number: "" });
    const { data } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAccounts(data ?? []);
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's your financial overview.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Balance</CardDescription>
              <CardTitle className="text-3xl font-bold">
                ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across {accounts.length} account(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Accounts</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {accounts.filter((a) => a.status === "active").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {accounts.filter((a) => a.status === "frozen").length} frozen
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Quick Actions</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => navigate("/transfer")}>
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => createAccount("savings")}>
                <Plus className="h-4 w-4 mr-1" />
                New Account
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Accounts list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No accounts yet.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={() => createAccount("savings")}>Create Savings Account</Button>
                  <Button variant="outline" onClick={() => createAccount("current")}>Create Current Account</Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.account_number}</TableCell>
                      <TableCell className="capitalize">{account.account_type}</TableCell>
                      <TableCell>
                        <Badge variant={account.status === "active" ? "default" : "destructive"}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-xs">{txn.reference_code}</TableCell>
                      <TableCell className="capitalize">{txn.transaction_type}</TableCell>
                      <TableCell>{txn.narration || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.status === "completed"
                              ? "default"
                              : txn.status === "reversed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

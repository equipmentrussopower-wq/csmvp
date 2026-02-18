import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

const Transactions = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Tables<"transactions">[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchTransactions = async () => {
            const { data } = await supabase
                .from("transactions")
                .select("*")
                .order("created_at", { ascending: false });
            setTransactions(data ?? []);
            setLoading(false);
        };
        fetchTransactions();
    }, [user]);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
                        <p className="text-muted-foreground mt-1">Review your recent banking activity</p>
                    </div>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export Statement
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Transaction History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No transactions found.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Narration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((txn) => (
                                        <TableRow key={txn.id}>
                                            <TableCell className="text-sm">
                                                {new Date(txn.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{txn.reference_code}</TableCell>
                                            <TableCell className="capitalize">{txn.transaction_type}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{txn.narration || "—"}</TableCell>
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

export default Transactions;

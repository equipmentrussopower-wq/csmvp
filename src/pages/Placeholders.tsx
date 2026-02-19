import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bell, Info, CheckCircle2, AlertTriangle, AlertOctagon, Check, Inbox } from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";

function typeConfig(type: string) {
    switch (type) {
        case "success": return { Icon: CheckCircle2, bg: "bg-green-100", color: "text-green-600", border: "border-green-200" };
        case "warning": return { Icon: AlertTriangle, bg: "bg-amber-100", color: "text-amber-600", border: "border-amber-200" };
        case "alert": return { Icon: AlertOctagon, bg: "bg-red-100", color: "text-red-500", border: "border-red-200" };
        default: return { Icon: Info, bg: "bg-blue-100", color: "text-[#117ACA]", border: "border-blue-200" };
    }
}

export const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Tables<"notifications">[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifs = async () => {
        if (!user) return;
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .or(`user_id.eq.${user.id},user_id.is.null`)
            .order("created_at", { ascending: false });
        setNotifications(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchNotifs(); }, [user]);

    const markRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
        if (!unreadIds.length) return;
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-sm font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-full">{unreadCount}</span>
                            )}
                        </h1>
                        <p className="text-muted-foreground mt-1">Your alerts and messages</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
                        >
                            <Check className="h-4 w-4" /> Mark all read
                        </button>
                    )}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : notifications.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-20 flex flex-col items-center gap-4">
                            <Inbox className="h-14 w-14 text-muted-foreground/20" />
                            <p className="font-semibold text-muted-foreground">No notifications yet</p>
                            <p className="text-sm text-muted-foreground/60">You're all caught up!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((n) => {
                            const { Icon, bg, color, border } = typeConfig(n.type);
                            return (
                                <Card
                                    key={n.id}
                                    className={cn(
                                        "cursor-pointer transition-all hover:bg-muted/50",
                                        !n.is_read && "border-primary/50 shadow-sm"
                                    )}
                                    onClick={() => !n.is_read && markRead(n.id)}
                                >
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", bg)}>
                                            <Icon className={cn("h-5 w-5", color)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn("font-semibold text-base", n.is_read ? "text-muted-foreground" : "text-foreground")}>
                                                    {n.title}
                                                </p>
                                                {!n.is_read && (
                                                    <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(n.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                {n.user_id === null && <span className="ml-2 text-primary font-medium">· Broadcast</span>}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export const Help = () => (
    <DashboardLayout>
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Contact Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Our support team is available 24/7 to help you with any banking inquiries.</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold">Email Us</h3>
                            <p className="text-sm text-blue-600">support@chase.com</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold">Call Us</h3>
                            <p className="text-sm text-blue-600">+1 (800) 935-9935</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
);

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Mail } from "lucide-react";

export const Notifications = () => (
    <DashboardLayout>
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Notifications</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Alerts & Messages
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12 text-muted-foreground flex flex-col items-center gap-4">
                    <Mail className="h-12 w-12 text-gray-300" />
                    <p>You have no new notifications.</p>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
);

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

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/PageLoader";

export const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, isAdmin, kycStatus, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Redirect to KYC if not approved and trying to access restricted pages
  // Admins skip KYC for the admin panel usually, but for demo we can enforce it if needed.
  if (!isAdmin && kycStatus !== "approved" && location.pathname !== "/kyc") {
    return <Navigate to="/kyc" replace />;
  }

  // Prevent accessing KYC if already approved
  if (kycStatus === "approved" && location.pathname === "/kyc") {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PendingApproval } from '../../features/auth/PendingApproval';
import { CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('player' | 'coach' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return null; // Wird in der Hauptansicht abgefangen
  }

  // Absicherung: Rollen immer als Array behandeln
  const roles = Array.isArray(userProfile.roles) ? userProfile.roles : [];
  const isAdmin = roles.includes("admin");

  // Admins automatisch freigeben oder explizit auf isApproved prüfen
  if (!userProfile.isApproved && !isAdmin) {
    return <PendingApproval />;
  }

  // Rollenprüfung mit Fallback-Array
  if (allowedRoles && !allowedRoles.some(role => roles.includes(role))) {
    return (
      <div className="p-8 text-center text-red-600">
        Keine Berechtigung für diese Seite.
      </div>
    );
  }

  return <>{children}</>;
};
/**
 * Componente para proteger rutas que requieren autenticación
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="error-screen">
        <h1>🔒 Acceso Denegado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        <a href="/chat">Volver al chat</a>
      </div>
    );
  }

  return <>{children}</>;
};

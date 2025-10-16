import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { adminAPI, User, SystemStats, SystemConfig } from "../api/client";
import "./AdminPanel.css";

type TabKey = "dashboard" | "users" | "config";

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Ocurrio un error inesperado";
};

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("es-PE").format(value);
};

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [config, setConfig] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queriesEnabled, setQueriesEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      void loadUsers();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, configResponse] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getConfig(),
      ]);
      setStats(statsResponse);
      setConfig(configResponse.config);

      const queriesConfig = configResponse.config.find((item) => item.key === "queries_enabled");
      const maintenanceConfig = configResponse.config.find((item) => item.key === "maintenance_mode");

      setQueriesEnabled(queriesConfig?.value === "true");
      setMaintenanceMode(maintenanceConfig?.value === "true");
    } catch (cause) {
      console.error("Error cargando datos del dashboard", cause);
      setError(safeErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { users: usersResponse } = await adminAPI.getUsers();
      setUsers(usersResponse);
    } catch (cause) {
      console.error("Error cargando usuarios", cause);
      setError("No se pudo cargar la lista de usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQueries = async () => {
    try {
      const newValue = !queriesEnabled;
      await adminAPI.updateConfig({ queries_enabled: String(newValue) });
      setQueriesEnabled(newValue);
    } catch (cause) {
      console.error("Error actualizando queries_enabled", cause);
      setError("No se pudo actualizar la configuracion de consultas");
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const newValue = !maintenanceMode;
      await adminAPI.updateConfig({ maintenance_mode: String(newValue) });
      setMaintenanceMode(newValue);
    } catch (cause) {
      console.error("Error actualizando maintenance_mode", cause);
      setError("No se pudo actualizar la configuracion de mantenimiento");
    }
  };

  const handleUpdateUserRole = async (userId: string, role: User["role"]) => {
    try {
      await adminAPI.updateUser(userId, { role });
      await loadUsers();
    } catch (cause) {
      console.error("Error actualizando rol de usuario", cause);
      setError("No se pudo actualizar el rol del usuario");
    }
  };

  const handleUpdateUserPlan = async (userId: string, plan: User["plan"]) => {
    try {
      await adminAPI.updateUser(userId, { plan });
      await loadUsers();
    } catch (cause) {
      console.error("Error actualizando plan de usuario", cause);
      setError("No se pudo actualizar el plan del usuario");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Estas seguro de eliminar este usuario?")) {
      return;
    }
    try {
      await adminAPI.deleteUser(userId);
      await loadUsers();
    } catch (cause) {
      console.error("Error eliminando usuario", cause);
      setError("No se pudo eliminar el usuario");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const dashboardCards = useMemo(() => {
    if (!stats) {
      return [];
    }
    return [
      { title: "Usuarios totales", value: formatNumber(stats.users.total_users) },
      { title: "Usuarios activos 24h", value: formatNumber(stats.users.active_24h) },
      { title: "Consultas 24h", value: formatNumber(stats.commands.total_commands) },
      { title: "Sesiones activas", value: formatNumber(stats.sessions.active_sessions) },
    ];
  }, [stats]);

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/ciad-logo.png" alt="CIAD" className="admin-logo-img" />
          <div>
            <h1>Admin Panel</h1>
            <span className="admin-subtitle">Centro de Información de Actos Delictivos</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>
          <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
            Usuarios
          </button>
          <button className={activeTab === "config" ? "active" : ""} onClick={() => setActiveTab("config")}>
            Configuracion
          </button>
        </nav>

        <div className="admin-user">
          <div className="admin-user-avatar">{user?.username.charAt(0).toUpperCase()}</div>
          <div className="admin-user-info">
            <strong>{user?.username}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {error ? (
          <div className="admin-alert">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : null}

        {activeTab === "dashboard" && (
          <div className="admin-content">
            {loading ? (
              <div className="admin-loading">
                <div className="spinner" />
                <p>Cargando panel...</p>
              </div>
            ) : (
              <div className="dashboard-grid">
                {dashboardCards.map((card) => (
                  <div key={card.title} className="dashboard-card">
                    <span>{card.title}</span>
                    <strong>{card.value}</strong>
                  </div>
                ))}

                <div className="control-panel">
                  <h2>Controles rapidos</h2>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Consultas</h4>
                      <p>Permite o bloquea las consultas de los usuarios</p>
                    </div>
                    <button className={`toggle-btn ${queriesEnabled ? "active" : ""}`} onClick={handleToggleQueries}>
                      {queriesEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Mantenimiento</h4>
                      <p>Activa o desactiva el modo mantenimiento</p>
                    </div>
                    <button className={`toggle-btn ${maintenanceMode ? "active" : ""}`} onClick={handleToggleMaintenance}>
                      {maintenanceMode ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-content">
            {loading ? (
              <div className="admin-loading">
                <div className="spinner" />
                <p>Cargando usuarios...</p>
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Plan</th>
                      <th>Creditos</th>
                      <th>Estado</th>
                      <th>Ultimo login</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-small">{item.username.charAt(0).toUpperCase()}</div>
                            <strong>{item.username}</strong>
                          </div>
                        </td>
                        <td>{item.email}</td>
                        <td>
                          <select
                            value={item.role}
                            onChange={(event) => handleUpdateUserRole(item.id, event.target.value as User["role"])}
                            className={`role-select role-${item.role}`}
                          >
                            <option value="user">User</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={item.plan}
                            onChange={(event) => handleUpdateUserPlan(item.id, event.target.value as User["plan"])}
                            className={`plan-select plan-${item.plan.toLowerCase()}`}
                          >
                            <option value="FREE">FREE</option>
                            <option value="BASIC">BASIC</option>
                            <option value="PREMIUM">PREMIUM</option>
                            <option value="GOLD">GOLD</option>
                            <option value="PLATINUM">PLATINUM</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td>{item.credits}</td>
                        <td>
                          <span className={`status ${item.is_active ? "active" : "inactive"}`}>
                            {item.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>{item.last_login ? new Date(item.last_login).toLocaleDateString() : "Nunca"}</td>
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteUser(item.id)}
                            disabled={item.id === user?.id}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "config" && (
          <div className="admin-content">
            <div className="config-list">
              {config.map((item) => (
                <div key={item.key} className="config-item">
                  <div className="config-info">
                    <h4>{item.key}</h4>
                    <p>{item.description || "Sin descripcion"}</p>
                  </div>
                  <div className="config-value">
                    <code>{item.value}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

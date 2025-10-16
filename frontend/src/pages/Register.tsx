import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./Auth.css";

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(formData);
      navigate("/chat");
    } catch (cause) {
      console.error("Error registrando usuario", cause);
      const message =
        typeof cause === "object" && cause !== null && "response" in cause
          ? (cause as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(message ?? "No se pudo registrar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/ciad-logo.png" alt="CIAD" className="auth-logo-img" />
          <h1>CIAD</h1>
          <p className="auth-subtitle-text">Centro de Información de Actos Delictivos</p>
          <p>Crea una nueva cuenta</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? (
            <div className="alert alert-error">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="tu_usuario"
              value={formData.username}
              onChange={(event) => setFormData({ ...formData, username: event.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

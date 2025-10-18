import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { SimpleCaptcha } from "../components/SimpleCaptcha";
import "./Auth.css";

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaValid, setCaptchaValid] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(formData);
      navigate("/chat");
    } catch (cause) {
      console.error("Error iniciando sesion", cause);
      const message =
        typeof cause === "object" && cause !== null && "response" in cause
          ? (cause as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(message ?? "No se pudo iniciar sesion. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/ciad-logo.png" alt="CIAD" className="auth-logo-img" />
          <p className="auth-subtitle-text">Centro de Información de Actos Delictivos</p>
          <p>Accede con tu cuenta</p>
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

          <SimpleCaptcha onVerify={setCaptchaValid} />

          <button type="submit" className="btn-primary" disabled={loading || !captchaValid}>
            {loading ? "Iniciando..." : "Iniciar sesion"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            No tienes cuenta? <Link to="/register">Registrate aqui</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

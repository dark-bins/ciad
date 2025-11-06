import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatSession } from "../hooks/useChatSession";
import { ChatMessage } from "../types";
import { useAuth } from "../context/useAuth";
import { useCommandCatalog } from "../hooks/useCommandCatalog";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import "../App.css";

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const AttachmentBlock = ({ attachment }: { attachment: NonNullable<ChatMessage["attachments"]>[number] }) => {
  if (attachment.type === "image") {
    return (
      <figure className="attachment-card">
        <img src={attachment.url} alt={attachment.filename ?? "Imagen"} />
        {attachment.filename ? <figcaption>{attachment.filename}</figcaption> : null}
      </figure>
    );
  }

  // Para PDFs, mostrar visor embebido
  if (attachment.mimeType === "application/pdf") {
    return (
      <div className="pdf-viewer-container">
        <iframe
          src={attachment.url}
          title={attachment.filename ?? "Documento PDF"}
          className="pdf-viewer"
          style={{
            width: "100%",
            height: "600px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        />
        <div className="pdf-download-link">
          <a href={attachment.url} download={attachment.filename ?? "documento.pdf"}>
            📥 Descargar {attachment.filename ?? "PDF"}
          </a>
        </div>
      </div>
    );
  }

  // Para archivos de texto, permitir visualización y descarga
  if (attachment.mimeType === "text/plain") {
    return (
      <div className="text-file-container">
        <a className="attachment-link" href={attachment.url} download={attachment.filename ?? "archivo.txt"}>
          📄 {attachment.filename ?? "Descargar archivo de texto"}
        </a>
      </div>
    );
  }

  // Para otros tipos de documentos
  return (
    <a className="attachment-link" href={attachment.url} download={attachment.filename ?? "adjunto"}>
      📎 {attachment.filename ?? "Descargar adjunto"}
    </a>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const hasAttachments = Boolean(message.attachments?.length);
  return (
    <article className={`bubble bubble-${message.author}`}>
      <div className="bubble-inner">
        {hasAttachments ? (
          <div className="attachments-grid">
            {message.attachments!.map((attachment) => (
              <AttachmentBlock key={attachment.id} attachment={attachment} />
            ))}
          </div>
        ) : null}
        {message.body ? <p className="bubble-text">{message.body}</p> : null}
      </div>
      <footer className="bubble-meta">{formatTime(message.timestamp)}</footer>
    </article>
  );
};

export const Chat = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { session, messages, loading, error: sessionError, startSession, sendCommand } = useChatSession();
  const { catalog, loading: catalogLoading, error: catalogError } = useCommandCatalog();

  const [commandInput, setCommandInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeProvider, setActiveProvider] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      startSession(user.id).catch((cause) => {
        console.error("No se pudo iniciar la sesión de chat", cause);
      });
    }
  }, [user, startSession]);

  const allCategories = useMemo(() => catalog?.categories ?? [], [catalog]);

  // Filtrar categorías por proveedor seleccionado
  const categories = useMemo(() => {
    if (activeProvider === "all") {
      return allCategories;
    }
    // Solo mostrar categorías que tengan comandos del proveedor seleccionado
    return allCategories
      .map((category) => ({
        ...category,
        commands: category.commands.filter((cmd) => cmd.provider === activeProvider),
      }))
      .filter((category) => category.commands.length > 0);
  }, [allCategories, activeProvider]);

  const providers = useMemo(() => {
    const base = catalog?.providers ?? [];
    return [{ id: "all", name: "Todos", description: "Mostrar todos los proveedores" }, ...base];
  }, [catalog]);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((cat) => cat.id === activeCategory)) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    if (providers.length > 0 && activeProvider !== "all" && !providers.some((provider) => provider.id === activeProvider)) {
      setActiveProvider("all");
    }
  }, [providers, activeProvider]);

  const activeCategoryData = useMemo(
    () => categories.find((category) => category.id === activeCategory) ?? categories[0],
    [categories, activeCategory],
  );

  const filteredCommands = useMemo(() => {
    if (!activeCategoryData) {
      return [];
    }

    const providerFiltered =
      activeProvider === "all"
        ? activeCategoryData.commands
        : activeCategoryData.commands.filter((command) => command.provider === activeProvider);

    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return providerFiltered;
    }

    return providerFiltered.filter((item) => {
      const haystack = [item.command, item.label, item.description ?? "", ...(item.tags ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeCategoryData, activeProvider, searchTerm]);

  const totalCommands = useMemo(() => {
    return categories.reduce((acc, category) => acc + category.commands.length, 0);
  }, [categories]);
  const combinedError = sessionError || catalogError;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Auto logout after 5 minutes of inactivity
  useInactivityTimeout(handleLogout, 5 * 60 * 1000);

  const handleSendCommand = async (event: FormEvent) => {
    event.preventDefault();
    if (!commandInput.trim()) {
      return;
    }
    try {
      await sendCommand(commandInput.trim());
      setCommandInput("");
    } catch (cause) {
      console.error("Fallo al enviar el comando", cause);
    }
  };

  const handleCommandPick = (command: string) => {
    setCommandInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed.startsWith(command)) {
        return `${command} `;
      }
      return `${command} ${trimmed}`.trimEnd() + " ";
    });
  };

  return (
    <div className="app-container">
      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

      {/* Mobile Menu */}
      <nav className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-header">
          <div className="brand">
            <img src="/ciad-logo.png" alt="CIAD" className="brand-logo-img" style={{ width: "50px", height: "50px" }} />
          </div>
          <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        {user && (
          <div className="user-card">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <h3>{user.username}</h3>
              <span className={`user-badge ${user.role === "admin" ? "premium" : ""}`}>
                {user.role === "admin" ? "Admin" : user.role === "premium" ? "Premium" : "Usuario"}
              </span>
            </div>
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-label">Plan</span>
                <span className="stat-value">{user.plan}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Créditos</span>
                <span className="stat-value">{user.credits}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mobile-menu-actions">
          {isAdmin && (
            <button
              className="mobile-menu-btn-action"
              onClick={() => {
                navigate("/admin");
                setMobileMenuOpen(false);
              }}
            >
              <span>📊</span>
              Panel Administrativo
            </button>
          )}
          <button
            className="mobile-menu-btn-action logout"
            onClick={async () => {
              await logout();
              navigate("/login");
              setMobileMenuOpen(false);
            }}
          >
            <span>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <aside className="sidebar">
        <div className="brand">
          <img src="/ciad-logo.png" alt="CIAD" className="brand-logo-img" />
          <div>
            <h1>CIAD</h1>
            <span>Centro de Información de Actos Delictivos</span>
          </div>
        </div>

        {user && (
          <div className="user-card">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <h3>{user.username}</h3>
              <span className={`user-badge ${user.role === "admin" ? "premium" : ""}`}>
                {user.role === "admin" ? "Admin" : user.role === "premium" ? "Premium" : "Usuario"}
              </span>
            </div>
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-label">Plan</span>
                <span className="stat-value">{user.plan}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Créditos</span>
                <span className="stat-value">{user.credits}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Último acceso</span>
                <span className="stat-value">{user.last_login ? new Date(user.last_login).toLocaleString() : "Nunca"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-section muted">
          <h2>Estado del sistema</h2>
          <div className="system-stats">
            <div className="system-stat">
              <span className="status-dot online"></span>
              <span>Conexión activa</span>
            </div>
            {combinedError ? <p className="error">{combinedError}</p> : null}
          </div>
        </div>

        {isAdmin && (
          <div className="sidebar-section admin-section">
            <h2>Panel administrativo</h2>
            <button className="admin-panel-btn" onClick={() => navigate("/admin")}>
              Abrir panel
            </button>
          </div>
        )}

        <div className="sidebar-section muted">
          <button className="logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          {session && user ? (
            <div className="session-info">
              <strong>{user.username}</strong>
              <span>Sesión {session.sessionId}</span>
            </div>
          ) : (
            <div className="session-info">
              <strong>Bienvenido</strong>
              <span>Preparando sesión de chat</span>
            </div>
          )}

          <div className="session-meta">
            <div className="session-pill">
              <span className="pill-label">Comandos disponibles</span>
              <span className="pill-value">{totalCommands}</span>
            </div>
            <div className="session-pill">
              <span className="pill-label">Categorías</span>
              <span className="pill-value">{categories.length}</span>
            </div>
            {user && (
              <>
                <div className="session-pill">
                  <span className="pill-label">Plan</span>
                  <span className="pill-value">{user.plan}</span>
                </div>
                <div className="session-pill">
                  <span className="pill-label">Créditos</span>
                  <span className="pill-value">{user.credits}</span>
                </div>
              </>
            )}
          </div>
        </header>

        <section className="command-hub">
          <div className="command-hub-header">
            <div>
              <h2>Catálogo inteligente</h2>
              <p>Filtra por categoría, proveedor o busca directamente.</p>
            </div>
            <div className="command-search">
              <span aria-hidden="true">🔍</span>
              <input
                type="text"
                placeholder="Buscar comando o categoría..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <nav className="command-tabs" aria-label="Categorías de comandos">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`command-tab ${category.id === activeCategory ? "active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="tab-icon">{category.icon}</span>
                <span className="tab-label">{category.title}</span>
              </button>
            ))}
          </nav>

          <div className="command-providers" aria-label="Filtros por proveedor">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`provider-chip ${provider.id === activeProvider ? "active" : ""}`}
                style={provider.accentColor ? { borderColor: provider.accentColor } : undefined}
                onClick={() => setActiveProvider(provider.id)}
              >
                <span>{provider.name}</span>
                {provider.badge ? <small>{provider.badge}</small> : null}
              </button>
            ))}
          </div>

          {catalogLoading ? (
            <div className="command-loading">Cargando catálogo...</div>
          ) : catalogError ? (
            <div className="command-empty">
              <h3>No se pudo cargar el catálogo</h3>
              <p>{catalogError}</p>
            </div>
          ) : activeCategoryData ? (
            <div className="command-grid">
              {filteredCommands.length === 0 ? (
                <div className="command-empty">
                  <h3>No encontramos coincidencias</h3>
                  <p>Prueba con otro término, proveedor o categoría.</p>
                </div>
              ) : (
                filteredCommands.map((item) => (
                  <button key={item.command} type="button" className="command-card" onClick={() => handleCommandPick(item.command)}>
                    <div className="command-card-header">
                      <code>{item.command}</code>
                      <span className="command-icon">↘</span>
                    </div>
                    <p>{item.label}</p>
                    <div className="command-meta">
                      <span className="provider-badge">{catalog?.providers.find((prov) => prov.id === item.provider)?.name ?? item.provider}</span>
                      {item.availability && item.availability !== "all" ? (
                        <span className={`availability-badge availability-${item.availability}`}>
                          {item.availability === "admin" ? "Solo admin" : "Premium"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </section>

        <section className="panel chat-panel">
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <h3>Sin conversaciones</h3>
                <p>Envía un comando como <code>/dni 12345678</code> para comenzar.</p>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
          </div>

          <form className="composer" onSubmit={handleSendCommand}>
            <div className="composer-wrapper">
              <span className="composer-icon">/</span>
              <input
                type="text"
                placeholder="Escribe tu comando aquí... (ej: /dni 12345678)"
                value={commandInput}
                onChange={(event) => setCommandInput(event.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading || !commandInput.trim()}>
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

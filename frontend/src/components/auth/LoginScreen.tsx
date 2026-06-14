import { useState } from "react";
import { api } from "../../services/api";

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(password);
      if (!res.ok) {
        setError("Incorrect password");
        return;
      }
      onLogin();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: "var(--argos-navy)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--argos-deep)" }}
      >
        {/* Header with logo */}
        <div
          className="flex flex-col items-center gap-4 px-8 pt-10 pb-6"
          style={{ borderBottom: "1px solid var(--argos-steel)" }}
        >
          <div
            className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-lg"
            style={{
              borderColor: "var(--argos-sun)",
              boxShadow: "0 0 32px rgba(217,119,6,0.35)",
            }}
          >
            <img
              src="/logo-argos-1.jpg"
              alt="Argos"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1
              style={{
                fontFamily: "'Audiowide', sans-serif",
                fontWeight: 400,
                fontSize: "1.5rem",
                letterSpacing: "0.05em",
                background:
                  "linear-gradient(90deg, #92400e 0%, #d97706 40%, #fcd34d 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              ARGOS
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
              Knowledge base &amp; RAG assistant
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-7">
          <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
            Enter the password to access the application.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
              style={{
                background: "var(--argos-steel)",
                border: "1px solid #4b5563",
              }}
            />
            {error && (
              <p className="text-sm" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  loading || !password
                    ? "var(--argos-steel)"
                    : "var(--argos-sun)",
                color: loading || !password ? "#6b7280" : "#1f2937",
              }}
              onMouseEnter={(e) => {
                if (!loading && password)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#b45309";
              }}
              onMouseLeave={(e) => {
                if (!loading && password)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--argos-sun)";
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

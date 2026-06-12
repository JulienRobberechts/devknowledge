import { NavLink } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  Settings,
  FlaskConical,
  SquareCheck,
} from "lucide-react";
import { useConfig } from "../../hooks/useConfig";

const navItems = [
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/conversations", icon: MessageSquare, label: "Conversations" },
  { to: "/quiz", icon: SquareCheck, label: "Quiz" },
  { to: "/technical", icon: FlaskConical, label: "Technical" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function IconNav() {
  const { data: config } = useConfig();

  return (
    <nav
      className="flex flex-col items-center py-3 gap-1 w-14 shrink-0 h-full"
      style={{ background: "var(--argos-navy)" }}
    >
      {/* Logo / home link */}
      <NavLink to="/" end title="Argos — Dashboard" className="mb-2 shrink-0">
        {({ isActive }) => (
          <div
            className={`relative w-12 h-12 rounded-full bg-white border-2 border-[#d97706] shadow-2xl overflow-hidden transition-all ${
              isActive ? "" : "opacity-80 hover:opacity-100"
            }`}
            style={
              isActive ? { boxShadow: "0 0 40px rgba(217,119,6,0.25)" } : {}
            }
          >
            <img
              src="/logo-argos-1.jpg"
              alt="Argos"
              className="h-full w-full object-contain"
            />
            <div
              className="absolute inset-0"
              style={{ background: "#374151", mixBlendMode: "color" }}
            />
          </div>
        )}
      </NavLink>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          title={label}
          className={({ isActive }) =>
            `flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isActive
                ? "bg-[#374151] text-[#d97706]"
                : "text-slate-500 hover:bg-[#374151] hover:text-[#fcd34d]"
            }`
          }
        >
          <Icon size={20} />
        </NavLink>
      ))}
      <div className="mt-auto flex flex-col items-center gap-0.5 pb-1">
        <span
          className="text-[9px] text-slate-500 leading-tight"
          title={`Frontend v${__APP_VERSION__}`}
        >
          F {__APP_VERSION__}
        </span>
        {config?.version && (
          <span
            className="text-[9px] text-slate-500 leading-tight"
            title={`Backend v${config.version}`}
          >
            B {config.version}
          </span>
        )}
      </div>
    </nav>
  );
}

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
  { to: "/", icon: null, label: "Argos" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/conversations", icon: MessageSquare, label: "Conversations" },
  { to: "/quiz", icon: SquareCheck, label: "Quiz" },
  { to: "/technical", icon: FlaskConical, label: "Technical" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function IconNav() {
  const { data: config } = useConfig();

  return (
    <nav className="flex flex-col items-center py-4 gap-1 w-14 shrink-0 bg-slate-900 h-full">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          title={label}
          className={({ isActive }) =>
            `flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-700 hover:text-white"
            }`
          }
        >
          {Icon ? (
            <Icon size={20} />
          ) : (
            <span className="text-[10px] font-bold tracking-widest">
              {label}
            </span>
          )}
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

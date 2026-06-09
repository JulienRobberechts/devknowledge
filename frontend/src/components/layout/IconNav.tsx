import { NavLink } from "react-router-dom";
import { FileText, MessageSquare, Settings, FlaskConical } from "lucide-react";

const navItems = [
  { to: "/", icon: null, label: "Argos" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/conversations", icon: MessageSquare, label: "Conversations" },
  { to: "/technical", icon: FlaskConical, label: "Technique" },
  { to: "/settings", icon: Settings, label: "Paramètres" },
];

export default function IconNav() {
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
    </nav>
  );
}

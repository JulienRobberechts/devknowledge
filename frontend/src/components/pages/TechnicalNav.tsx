import { NavLink } from "react-router-dom";
import {
  FlaskConical,
  ArrowUpDown,
  Brain,
  ShieldCheck,
  Combine,
} from "lucide-react";

const pages = [
  { to: "/technical", label: "RAG Core", icon: FlaskConical, end: true },
  { to: "/technical/hybrid-search", label: "Hybrid Search", icon: Combine },
  { to: "/technical/reranking", label: "Re-ranking", icon: ArrowUpDown },
  { to: "/technical/llm-models", label: "Modèles LLM", icon: Brain },
  {
    to: "/technical/knowledge-check",
    label: "Knowledge Check",
    icon: ShieldCheck,
  },
];

export default function TechnicalNav() {
  return (
    <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
      {pages.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </div>
  );
}

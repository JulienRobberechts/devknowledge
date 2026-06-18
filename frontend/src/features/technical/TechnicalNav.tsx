import {
  ArrowUpDown,
  Brain,
  Combine,
  FlaskConical,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const pages = [
  { to: "/technical", label: "RAG Core", icon: FlaskConical, end: true },
  { to: "/technical/hybrid-search", label: "Hybrid Search", icon: Combine },
  { to: "/technical/reranking", label: "Re-ranking", icon: ArrowUpDown },
  { to: "/technical/llm-models", label: "LLM Models", icon: Brain },
  {
    to: "/technical/response-grounding",
    label: "Response Grounding",
    icon: ShieldCheck,
  },
  { to: "/technical/evaluation", label: "Evaluation", icon: Gauge },
];

export default function TechnicalNav() {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
      {pages.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-[#92400e] shadow-sm border border-amber-100"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
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

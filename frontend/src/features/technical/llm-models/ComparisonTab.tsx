import { Layers, CheckCircle } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";
import { MODELS } from "./models-data";
import { TierBadge } from "./ModelCard";

export default function ComparisonTab() {
  return (
    <Card>
      <SectionTitle
        icon={<Layers size={20} />}
        title="Comparison table"
        subtitle="All current models side by side"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Model
              </th>
              <th className="text-right py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Contexte
              </th>
              <th className="text-right py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Max output
              </th>
              <th className="text-right py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Input/MTok
              </th>
              <th className="text-right py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Output/MTok
              </th>
              <th className="text-center py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide">
                Adaptive
              </th>
              <th className="text-center py-2 font-semibold text-slate-500 uppercase tracking-wide">
                Extended
              </th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr
                key={m.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={m.tier} />
                    <span className="font-medium text-slate-800">{m.name}</span>
                  </div>
                  <code className="text-[10px] text-slate-400">{m.id}</code>
                </td>
                <td className="py-2.5 pr-4 text-right text-slate-700">
                  {m.contextWindow}
                </td>
                <td className="py-2.5 pr-4 text-right text-slate-700">
                  {m.maxOutput}
                </td>
                <td className="py-2.5 pr-4 text-right font-medium text-slate-800">
                  {m.inputPrice}
                </td>
                <td className="py-2.5 pr-4 text-right font-medium text-slate-800">
                  {m.outputPrice}
                </td>
                <td className="py-2.5 pr-4 text-center">
                  {m.adaptiveThinking ? (
                    <CheckCircle size={13} className="text-green-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="py-2.5 text-center">
                  {m.extendedThinking ? (
                    <CheckCircle size={13} className="text-green-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

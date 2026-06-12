export default function ParamRow({
  name,
  value,
  description,
}: {
  name: string;
  value: string;
  description: string;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 font-mono text-xs text-[#d97706] whitespace-nowrap font-medium">
        {name}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-slate-700 whitespace-nowrap">
        {value}
      </td>
      <td className="py-2.5 text-xs text-slate-600">{description}</td>
    </tr>
  );
}

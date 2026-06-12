export default function StrategyBadge({
  label,
}: {
  label: string;
  color?: string;
}) {
  return (
    <span className="inline-block border border-amber-200 rounded-full px-3 py-0.5 text-xs font-semibold bg-amber-50 text-[#92400e]">
      {label}
    </span>
  );
}

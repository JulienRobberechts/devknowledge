export default function PipelineStep({
  step,
  icon,
  title,
  description,
  isLast = false,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-[#1f2937] text-[#fcd34d] flex items-center justify-center font-bold text-sm flex-shrink-0">
          {step}
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-amber-200 mt-2 min-h-[2rem]" />
        )}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#d97706]">{icon}</span>
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

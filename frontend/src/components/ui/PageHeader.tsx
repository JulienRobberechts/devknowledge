import { Info } from "lucide-react";
import { useState } from "react";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  info: string;
}

export default function PageHeader({ icon, title, info }: PageHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-300 hover:text-blue-500 transition-colors"
          aria-label={`About: ${title}`}
        >
          <Info size={16} />
        </button>
      </div>
      {open && (
        <p className="mt-2 text-xs text-gray-500 bg-blue-50 rounded px-3 py-2 max-w-xl">
          {info}
        </p>
      )}
    </div>
  );
}

import type { DocumentStatus } from "../../types/domain";

const statusConfig: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  processing: {
    label: "Processing",
    className: "bg-yellow-100 text-yellow-700",
  },
  ready: { label: "Ready", className: "bg-green-100 text-green-700" },
  error: { label: "Error", className: "bg-red-100 text-red-700" },
};

export default function DocumentStatusBadge({
  status,
}: {
  status: DocumentStatus;
}) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

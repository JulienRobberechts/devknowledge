import type { SourceCitation } from "../../types/domain";

export default function SourceCard({ source }: { source: SourceCitation }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-gray-700">
          {source.documentTitle}
        </span>
        <span className="text-xs text-gray-400">
          {(source.score * 100).toFixed(0)}% match
        </span>
      </div>
      <p className="text-gray-500 text-xs line-clamp-3">{source.excerpt}</p>
    </div>
  );
}

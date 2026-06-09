import { SourceType } from "../../types/domain";

interface Props {
  sourceType: SourceType;
  size?: number;
}

export default function DocumentTypeIcon({ sourceType, size = 14 }: Props) {
  const s = size;

  if (sourceType === "pdf") {
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-500 shrink-0"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <text
          x="5"
          y="19"
          fontSize="7"
          fontWeight="bold"
          fill="currentColor"
          stroke="none"
        >
          PDF
        </text>
      </svg>
    );
  }

  if (sourceType === "markdown") {
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-500 shrink-0"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <text
          x="5"
          y="19"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          stroke="none"
        >
          MD
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400 shrink-0"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <text
        x="5"
        y="19"
        fontSize="6"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        TXT
      </text>
    </svg>
  );
}

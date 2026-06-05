export default function StreamingMessage({ text }: { text: string }) {
  return (
    <div className="text-gray-800 text-sm whitespace-pre-wrap">
      {text}
      <span className="inline-block w-0.5 h-4 ml-0.5 bg-gray-600 animate-pulse align-middle" />
    </div>
  );
}

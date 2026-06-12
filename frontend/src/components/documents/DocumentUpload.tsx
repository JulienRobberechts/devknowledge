import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadDocument } from "../../hooks/useDocuments";

export default function DocumentUpload({
  onUploaded,
}: {
  onUploaded?: (doc: { id: string; status: string }) => void;
} = {}) {
  const uploadDocument = useUploadDocument();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const doc = await uploadDocument.mutateAsync({ file });
          onUploaded?.(doc);
        }
      } finally {
        setUploading(false);
      }
    },
    [uploadDocument, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-[#d97706] bg-amber-50"
          : "border-slate-300 hover:border-[#d97706] hover:bg-amber-50/40"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="text-sm text-[#d97706] font-medium">Uploading...</div>
      ) : isDragActive ? (
        <div className="text-sm text-[#92400e] font-medium">
          Drop files here...
        </div>
      ) : (
        <div className="text-sm text-slate-500">
          Drag & drop files here, or click to select
          <div className="text-xs text-slate-400 mt-1">
            PDF, Markdown, or Text files
          </div>
        </div>
      )}
    </div>
  );
}

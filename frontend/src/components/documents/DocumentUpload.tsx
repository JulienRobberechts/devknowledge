import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadDocument } from "../../hooks/useDocuments";

export default function DocumentUpload() {
  const uploadDocument = useUploadDocument();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          await uploadDocument.mutateAsync({ file });
        }
      } finally {
        setUploading(false);
      }
    },
    [uploadDocument],
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
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="text-sm text-blue-600">Uploading...</div>
      ) : isDragActive ? (
        <div className="text-sm text-blue-600">Drop files here...</div>
      ) : (
        <div className="text-sm text-gray-500">
          Drag & drop files here, or click to select
          <div className="text-xs text-gray-400 mt-1">
            PDF, Markdown, or Text files
          </div>
        </div>
      )}
    </div>
  );
}

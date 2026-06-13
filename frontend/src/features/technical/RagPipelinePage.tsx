import { Workflow } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import RagPipelineVisualizer from "./rag-pipeline/RagPipelineVisualizer";

export default function RagPipelinePage() {
  return (
    <div className="p-8 w-full">
      <PageHeader
        icon={<Workflow className="text-[#d97706]" size={28} />}
        title="RAG Pipeline"
        info="Visualisation interactive du pipeline RAG étape par étape : de l'ingestion du document jusqu'à la réponse en streaming. 13 étapes, formules, code TypeScript/SQL de ce projet."
      />
      <RagPipelineVisualizer />
    </div>
  );
}

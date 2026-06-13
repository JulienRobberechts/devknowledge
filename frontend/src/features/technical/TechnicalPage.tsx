import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import TabBar from "../../components/ui/TabBar";
import OverviewTab from "./rag-core/OverviewTab";
import IngestionTab from "./rag-core/IngestionTab";
import QueryTab from "./rag-core/QueryTab";
import ConfigTab from "./rag-core/ConfigTab";

const TABS = ["Overview", "Ingestion", "Query", "Config"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function TechnicalPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    isTab(tabParam) ? tabParam : "Overview",
  );

  useEffect(() => {
    if (isTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <div className="p-8 w-full">
      <PageHeader
        icon={<FlaskConical className="text-[#d97706]" size={28} />}
        title="How RAG Works — Technical Deep Dive"
        info="Everything you need to understand Retrieval-Augmented Generation and how this project implements it, from document ingestion to streaming answers."
      />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Ingestion" && <IngestionTab />}
      {activeTab === "Query" && <QueryTab />}
      {activeTab === "Config" && <ConfigTab />}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Brain } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import TabBar from "../ui/TabBar";
import TechnicalNav from "./TechnicalNav";
import ModelsTab from "./llm-models/ModelsTab";
import ComparisonTab from "./llm-models/ComparisonTab";
import RagUsageTab from "./llm-models/RagUsageTab";
import ConfigTab from "./llm-models/ConfigTab";

const TABS = ["Models", "Comparison", "RAG Usage", "Config"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function LLMModelsPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    isTab(tabParam) ? tabParam : "Models",
  );

  useEffect(() => {
    if (isTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        icon={<Brain className="text-[#d97706]" size={28} />}
        title="LLM Models — Comparison"
        info="Overview of available Claude models, their characteristics, and when to use them in a RAG pipeline."
      />

      <TechnicalNav />
      <TabBar
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        activeTextColor="text-[#92400e]"
      />

      {activeTab === "Models" && <ModelsTab />}
      {activeTab === "Comparison" && <ComparisonTab />}
      {activeTab === "RAG Usage" && <RagUsageTab />}
      {activeTab === "Config" && <ConfigTab />}
    </div>
  );
}

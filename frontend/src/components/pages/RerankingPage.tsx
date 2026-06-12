import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import TabBar from "../ui/TabBar";
import TechnicalNav from "./TechnicalNav";
import OverviewTab from "./reranking/OverviewTab";
import PipelineTab from "./reranking/PipelineTab";
import ImplementationTab from "./reranking/ImplementationTab";
import TradeOffsTab from "./reranking/TradeOffsTab";

const TABS = ["Overview", "Pipeline", "Implementation", "Trade-offs"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function RerankingPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    isTab(tabParam) ? tabParam : "Overview",
  );

  useEffect(() => {
    if (isTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader
        icon={<ArrowUpDown className="text-[#d97706]" size={28} />}
        title="Re-ranking — Technical Deep Dive"
        info="Why vector search alone isn't enough, how a cross-encoder fixes it, and how Voyage rerank-2.5 is wired into this project."
      />

      <TechnicalNav />
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Pipeline" && <PipelineTab />}
      {activeTab === "Implementation" && <ImplementationTab />}
      {activeTab === "Trade-offs" && <TradeOffsTab />}
    </div>
  );
}

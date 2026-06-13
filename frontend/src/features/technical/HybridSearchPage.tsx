import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Combine } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import TabBar from "../../components/ui/TabBar";
import OverviewTab from "./hybrid-search/OverviewTab";
import PipelineTab from "./hybrid-search/PipelineTab";
import ImplementationTab from "./hybrid-search/ImplementationTab";
import TradeOffsTab from "./hybrid-search/TradeOffsTab";

const TABS = ["Overview", "Pipeline", "Implementation", "Trade-offs"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function HybridSearchPage() {
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
        icon={<Combine className="text-[#d97706]" size={28} />}
        title="Hybrid Search — Technical Deep Dive"
        info="Why vector search alone fails on exact terms, how BM25 complements it, and how Reciprocal Rank Fusion merges both signals inside PostgreSQL."
      />

      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Pipeline" && <PipelineTab />}
      {activeTab === "Implementation" && <ImplementationTab />}
      {activeTab === "Trade-offs" && <TradeOffsTab />}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../ui/PageHeader";
import TabBar from "../ui/TabBar";
import TechnicalNav from "./TechnicalNav";
import OverviewTab from "./knowledge-check/OverviewTab";
import StrategiesTab from "./knowledge-check/StrategiesTab";
import ImplementationTab from "./knowledge-check/ImplementationTab";
import TradeOffsTab from "./knowledge-check/TradeOffsTab";

const TABS = [
  "Overview",
  "Strategies",
  "Implementation",
  "Trade-offs",
] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function KnowledgeCheckPage() {
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
        icon={<ShieldCheck className="text-[#d97706]" size={28} />}
        title="Knowledge Check — Technical Deep Dive"
        info="Three strategies to detect whether an LLM answer comes from retrieved documents or from the model's training data."
      />

      <TechnicalNav />
      <TabBar
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        activeTextColor="text-[#92400e]"
      />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Strategies" && <StrategiesTab />}
      {activeTab === "Implementation" && <ImplementationTab />}
      {activeTab === "Trade-offs" && <TradeOffsTab />}
    </div>
  );
}

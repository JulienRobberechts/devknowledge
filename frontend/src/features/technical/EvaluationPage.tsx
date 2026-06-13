import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Gauge } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import TabBar from "../../components/ui/TabBar";
import OverviewTab from "./evaluation/OverviewTab";
import MetricsTab from "./evaluation/MetricsTab";
import RisksTab from "./evaluation/RisksTab";
import ImplementationTab from "./evaluation/ImplementationTab";

const TABS = ["Overview", "Metrics", "Risks", "Implementation"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function EvaluationPage() {
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
        icon={<Gauge className="text-[#d97706]" size={28} />}
        title="RAG Evaluation — Technical Deep Dive"
        info="Why RAG systems fail silently, how three independent metrics expose each failure mode, and how the eval pipeline is wired in this project."
      />

      <TabBar
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        activeTextColor="text-[#92400e]"
      />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Metrics" && <MetricsTab />}
      {activeTab === "Risks" && <RisksTab />}
      {activeTab === "Implementation" && <ImplementationTab />}
    </div>
  );
}

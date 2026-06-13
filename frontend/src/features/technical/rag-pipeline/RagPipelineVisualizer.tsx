import { useCallback, useEffect, useRef, useState } from "react";
import { type Phase, type Step, STEPS } from "./steps-data";
import DetailPanel from "./DetailPanel";

// ── Phase colour palette ──────────────────────────────────────
const PC: Record<
  Phase,
  { accent: string; dim: string; border: string; iconBg: string; bg: string }
> = {
  ing: {
    accent: "#58a6ff",
    dim: "rgba(88,166,255,0.1)",
    border: "rgba(88,166,255,0.3)",
    iconBg: "rgba(88,166,255,0.15)",
    bg: "rgba(88,166,255,0.06)",
  },
  q: {
    accent: "#3fb950",
    dim: "rgba(63,185,80,0.1)",
    border: "rgba(63,185,80,0.3)",
    iconBg: "rgba(63,185,80,0.15)",
    bg: "rgba(63,185,80,0.06)",
  },
  gen: {
    accent: "#bc8cff",
    dim: "rgba(188,140,255,0.1)",
    border: "rgba(188,140,255,0.3)",
    iconBg: "rgba(188,140,255,0.15)",
    bg: "rgba(188,140,255,0.06)",
  },
  eval: {
    accent: "#f0883e",
    dim: "rgba(240,136,62,0.1)",
    border: "rgba(240,136,62,0.3)",
    iconBg: "rgba(240,136,62,0.15)",
    bg: "rgba(240,136,62,0.06)",
  },
};

// ── Connector ─────────────────────────────────────────────────
function StepConnector({ phase, flowing }: { phase: Phase; flowing: boolean }) {
  const { accent } = PC[phase];
  return (
    <div className="relative w-0.5 h-5 ml-5 bg-slate-700 overflow-hidden">
      {flowing && (
        <div
          key={Date.now()}
          className="absolute inset-0"
          style={{
            background: accent,
            animation: "flowDown 0.6s ease forwards",
          }}
        />
      )}
    </div>
  );
}

// ── Step node ─────────────────────────────────────────────────
const StepNode = ({
  step,
  index,
  state,
  onClick,
  nodeRef,
}: {
  step: Step;
  index: number;
  state: "idle" | "active" | "done";
  onClick: () => void;
  nodeRef?: React.Ref<HTMLDivElement>;
}) => {
  const { accent, dim, border, iconBg } = PC[step.phase];

  return (
    <div
      ref={nodeRef}
      onClick={onClick}
      className="relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200"
      style={{
        background:
          state === "active"
            ? dim
            : state === "done"
              ? "rgba(255,255,255,0.02)"
              : "#161b22",
        borderColor: state === "active" ? border : "rgba(255,255,255,0.07)",
        boxShadow:
          state === "active"
            ? `0 0 0 1px ${border}, 0 4px 24px ${dim}`
            : "none",
        opacity: state === "done" ? 0.55 : 1,
      }}
    >
      {/* Icon */}
      <div
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: iconBg, border: `1px solid ${border}` }}
      >
        {state === "active" && (
          <span
            className="absolute -inset-1.5 rounded-xl border-2 pointer-events-none"
            style={{
              borderColor: accent,
              animation: "pulseRing 1.8s ease-out infinite",
            }}
          />
        )}
        {step.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="text-[0.87rem] font-semibold text-slate-200">
          {step.label}
        </div>
        <div className="text-[0.73rem] text-slate-500 mt-0.5 font-mono">
          {step.sub}
        </div>

        {state === "active" && (
          <div
            className="mt-2.5 space-y-1"
            style={{ animation: "slideIn 0.25s ease" }}
          >
            <div className="flex gap-2 items-baseline px-2 py-1.5 rounded bg-white/5 font-mono text-[0.71rem]">
              <span className="text-slate-500 min-w-[40px]">↳ in</span>
              <span className="text-slate-300">{step.input.val}</span>
            </div>
            <div className="text-[0.63rem] text-slate-600 pl-2">
              ⬇ transformation
            </div>
            <div
              className="flex gap-2 items-baseline px-2 py-1.5 rounded font-mono text-[0.71rem]"
              style={{ background: dim }}
            >
              <span className="text-slate-500 min-w-[40px]">↳ out</span>
              <span style={{ color: accent }}>{step.output.val}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div
        className="w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 flex items-center justify-center text-[0.55rem] font-black"
        style={{
          background: state === "done" ? "#3fb950" : "transparent",
          borderColor:
            state === "done"
              ? "#3fb950"
              : state === "active"
                ? accent
                : "#30363d",
          color: state === "done" ? "#0d1117" : "transparent",
        }}
      >
        ✓
      </div>

      <span className="absolute top-2 right-3 text-[0.6rem] text-slate-600 font-mono tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
};

// ── Phase block (collapsable) ─────────────────────────────────
function PhaseBlock({
  phase,
  title,
  desc,
  badge,
  steps,
  expanded,
  currentStep,
  flowingConnector,
  onStepClick,
  activeStepRef,
}: {
  phase: Phase;
  title: string;
  desc: string;
  badge: string;
  steps: Step[];
  expanded: boolean;
  currentStep: number;
  flowingConnector: number;
  onStepClick: (globalIdx: number) => void;
  activeStepRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { accent, bg } = PC[phase];

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg mb-2 border-l-[3px]"
        style={{ background: bg, borderColor: accent }}
      >
        <h2 className="text-[0.8rem] font-bold uppercase tracking-widest text-slate-300">
          {title}
        </h2>
        <span className="text-[0.72rem] text-slate-500">{desc}</span>
        <span
          className="ml-auto text-[0.67rem] font-semibold px-2 py-0.5 rounded-full border"
          style={{ color: accent, background: bg, borderColor: `${accent}40` }}
        >
          {badge}
        </span>
      </div>

      {expanded && (
        <div className="flex flex-col">
          {steps.map((step, i) => {
            const globalIdx = STEPS.indexOf(step);
            const state =
              globalIdx === currentStep
                ? "active"
                : globalIdx < currentStep
                  ? "done"
                  : "idle";
            const isLast = i === steps.length - 1;
            const isActive = globalIdx === currentStep;

            return (
              <div key={step.id} className="flex flex-col">
                <StepNode
                  step={step}
                  index={globalIdx}
                  state={state}
                  onClick={() => onStepClick(globalIdx)}
                  nodeRef={isActive ? activeStepRef : undefined}
                />
                {!isLast && (
                  <StepConnector
                    phase={phase}
                    flowing={flowingConnector === globalIdx}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────
function Timeline({
  currentStep,
  onDotClick,
}: {
  currentStep: number;
  onDotClick: (i: number) => void;
}) {
  const phaseBreaks = ["ing", "q", "gen"] as const;

  return (
    <div className="flex items-center gap-0 px-4 py-1.5 bg-[#161b22] border-b border-slate-800 overflow-x-auto">
      {STEPS.map((step, i) => {
        const { accent, dim: accentDim } = PC[step.phase];
        const isDone = i < currentStep;
        const isActive = i === currentStep;

        const isLastInPhase =
          i === STEPS.length - 1 ? false : STEPS[i + 1].phase !== step.phase;
        const isVeryLast = i === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div className="relative group">
              <div
                onClick={() => onDotClick(i)}
                title={step.label}
                className="w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 hover:scale-150"
                style={{
                  background: isActive
                    ? accent
                    : isDone
                      ? accentDim
                      : "#30363d",
                  boxShadow: isActive ? `0 0 5px ${accent}` : "none",
                }}
              />
              <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.55rem] bg-[#161b22] border border-slate-700 rounded px-1.5 py-0.5 text-slate-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {step.label}
              </span>
            </div>
            {!isLastInPhase && !isVeryLast && (
              <div
                className="h-px w-3 flex-shrink-0 transition-colors duration-300"
                style={{ background: isDone ? accent : "#21262d" }}
              />
            )}
            {isLastInPhase &&
              phaseBreaks.includes(
                step.phase as (typeof phaseBreaks)[number],
              ) && <div className="w-px h-4 bg-slate-700 mx-2 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
const PHASES: { phase: Phase; title: string; desc: string }[] = [
  {
    phase: "ing",
    title: "Phase 1 — Ingestion",
    desc: "Offline · pré-calcul des représentations vectorielles",
  },
  {
    phase: "q",
    title: "Phase 2 — Retrieval",
    desc: "Online · du prompt aux chunks pertinents",
  },
  {
    phase: "gen",
    title: "Phase 3 — Génération",
    desc: "Online · synthèse LLM avec streaming SSE",
  },
  {
    phase: "eval",
    title: "Phase 4 — Évaluation",
    desc: "Mesure de qualité · fidélité, citations, robustesse",
  },
];

export default function RagPipelineVisualizer() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [flowingConnector, setFlowingConnector] = useState(-1);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const stepsByPhase = Object.fromEntries(
    PHASES.map(({ phase }) => [phase, STEPS.filter((s) => s.phase === phase)]),
  ) as Record<Phase, Step[]>;

  const activePhase: Phase | null =
    currentStep >= 0 ? (STEPS[currentStep]?.phase ?? null) : null;

  const goToStep = useCallback((idx: number) => {
    setCurrentStep(idx);
    if (idx > 0) setFlowingConnector(idx - 1);
  }, []);

  // Auto-scroll active step into view
  useEffect(() => {
    if (!activeStepRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const node = activeStepRef.current;
    const nodeTop = node.offsetTop;
    const nodeBottom = nodeTop + node.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (nodeTop < viewTop + 8) {
      container.scrollTo({ top: nodeTop - 8, behavior: "smooth" });
    } else if (nodeBottom > viewBottom - 8) {
      container.scrollTo({
        top: nodeBottom - container.clientHeight + 8,
        behavior: "smooth",
      });
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentStep > 0) goToStep(currentStep - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentStep, goToStep]);

  const progress =
    currentStep < 0 ? 0 : ((currentStep + 1) / STEPS.length) * 100;

  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0%   { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.5); }
        }
        @keyframes flowDown {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tokenAppear { to { opacity: 1; } }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }
      `}</style>

      {/* Progress bar */}
      <div
        className="fixed top-0 left-0 h-0.5 z-50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #58a6ff, #bc8cff)",
          boxShadow: "0 0 6px #58a6ff",
        }}
      />

      <div
        className="flex flex-col rounded-xl overflow-hidden border border-slate-800"
        style={{
          background: "#0d1117",
          height: "calc(100vh - 220px)",
          minHeight: "500px",
        }}
      >
        <Timeline currentStep={currentStep} onDotClick={goToStep} />

        <div className="flex flex-1 overflow-hidden">
          {/* Pipeline panel */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-5 min-w-0"
          >
            {PHASES.map(({ phase, title, desc }) => {
              const phaseSteps = stepsByPhase[phase];
              const badge = `${phaseSteps.length} étape${phaseSteps.length > 1 ? "s" : ""}`;
              const expanded = activePhase === phase || activePhase === null;

              return (
                <PhaseBlock
                  key={phase}
                  phase={phase}
                  title={title}
                  desc={desc}
                  badge={badge}
                  steps={phaseSteps}
                  expanded={expanded}
                  currentStep={currentStep}
                  flowingConnector={flowingConnector}
                  onStepClick={goToStep}
                  activeStepRef={activeStepRef}
                />
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="w-[400px] flex-shrink-0 border-l border-slate-800 overflow-y-auto bg-[#161b22]">
            <div className="px-4 py-2.5 border-b border-slate-800 text-[0.65rem] uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#3fb950]"
                style={{ animation: "blink 1.5s ease infinite" }}
              />
              Détail technique
            </div>
            <DetailPanel step={currentStep >= 0 ? STEPS[currentStep] : null} />
          </div>
        </div>
      </div>
    </>
  );
}

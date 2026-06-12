import { X } from "lucide-react";
import type {
  ConversationParams,
  KnowledgeCheckStrategy,
} from "../../types/domain";
import {
  Field,
  Toggle,
  RERANK_MODELS,
  LLM_MODELS,
} from "./ParamsPanelControls";

export default function ParamsPanel({
  params,
  onChange,
  readOnly = false,
  onClose,
}: {
  params: Partial<ConversationParams>;
  onChange?: (p: Partial<ConversationParams>) => void;
  readOnly?: boolean;
  onClose?: () => void;
}) {
  const inputClass = readOnly
    ? "w-16 text-xs text-right border border-slate-100 rounded-md px-2 py-1 bg-slate-50 text-slate-400 cursor-default"
    : "w-16 text-xs text-right border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 bg-white text-slate-700";

  const selectClass = `text-xs border rounded-md px-2 py-1 max-w-[140px] outline-none ${
    readOnly
      ? "bg-slate-50 border-slate-100 text-slate-400 cursor-default"
      : "bg-white border-slate-200 text-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
  }`;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div>
          <p className="text-sm font-semibold text-slate-800">Settings</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {readOnly
              ? "Read-only · active conversation"
              : "Applied to the next conversation"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            Retrieval
          </p>
          <Field
            label="Results limit"
            info="Maximum number of chunks retrieved from the vector index and injected into the LLM context."
            techLink="/technical?tab=Config"
          >
            <input
              type="number"
              value={params.retrievalLimit ?? 5}
              min={1}
              max={20}
              readOnly={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) =>
                      onChange?.({
                        ...params,
                        retrievalLimit: parseFloat(e.target.value),
                      })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Min similarity score"
            info="Cosine similarity threshold (0–1). Chunks with a score below this value are excluded from the context."
            techLink="/technical?tab=Config"
          >
            <input
              type="number"
              value={params.retrievalMinScore ?? 0.5}
              min={0}
              max={1}
              step={0.05}
              readOnly={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) =>
                      onChange?.({
                        ...params,
                        retrievalMinScore: parseFloat(e.target.value),
                      })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Search mode"
            info="'hybrid' fuses vector similarity (pgvector) and full-text (BM25/tsvector) rankings via Reciprocal Rank Fusion. 'vector' uses cosine similarity only."
            techLink="/technical/hybrid-search"
          >
            <select
              value={params.searchMode ?? "hybrid"}
              disabled={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) =>
                      onChange?.({
                        ...params,
                        searchMode: e.target.value as "vector" | "hybrid",
                      })
              }
              className={selectClass}
            >
              <option value="hybrid">hybrid</option>
              <option value="vector">vector</option>
            </select>
          </Field>
          <Field
            label="Reranking"
            info="Enables a second retrieval stage using a cross-encoder model."
            techLink="/technical/reranking"
          >
            <Toggle
              checked={params.rerankEnabled ?? false}
              onChange={
                readOnly
                  ? () => {}
                  : (v) => onChange?.({ ...params, rerankEnabled: v })
              }
              disabled={readOnly}
            />
          </Field>
          {params.rerankEnabled && (
            <Field
              label="Rerank model"
              info="Cross-encoder model used for the reranking stage."
              techLink="/technical/reranking"
            >
              <select
                value={params.rerankModel ?? RERANK_MODELS[0].value}
                disabled={readOnly}
                onChange={
                  readOnly
                    ? undefined
                    : (e) =>
                        onChange?.({ ...params, rerankModel: e.target.value })
                }
                className={selectClass}
              >
                {RERANK_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {params.rerankEnabled && (
            <Field
              label="Candidate multiplier"
              info="Retrieves N × limit candidates before reranking, then keeps only the top limit."
              techLink="/technical/reranking"
            >
              <input
                type="number"
                value={params.rerankCandidateMultiplier ?? 3}
                min={1}
                max={10}
                readOnly={readOnly}
                onChange={
                  readOnly
                    ? undefined
                    : (e) =>
                        onChange?.({
                          ...params,
                          rerankCandidateMultiplier: parseFloat(e.target.value),
                        })
                }
                className={inputClass}
              />
            </Field>
          )}
        </section>

        <div className="h-px bg-slate-100" />

        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            Generation
          </p>
          <Field
            label="Model"
            info="LLM used for response generation."
            techLink="/technical/llm-models"
          >
            <select
              value={params.llmModel ?? LLM_MODELS[0].value}
              disabled={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) => onChange?.({ ...params, llmModel: e.target.value })
              }
              className={selectClass}
            >
              {LLM_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Temperature"
            info="Controls response creativity (0 = deterministic, 1 = very creative)."
            techLink="/technical?tab=Config"
          >
            <input
              type="number"
              value={params.llmTemperature ?? 0.2}
              min={0}
              max={1}
              step={0.05}
              readOnly={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) =>
                      onChange?.({
                        ...params,
                        llmTemperature: parseFloat(e.target.value),
                      })
              }
              className={inputClass}
            />
          </Field>
          <Field
            label="Max tokens"
            info="Maximum number of tokens the LLM can generate in a response."
            techLink="/technical?tab=Config"
          >
            <input
              type="number"
              value={params.llmMaxTokens ?? 1024}
              min={64}
              max={8192}
              readOnly={readOnly}
              onChange={
                readOnly
                  ? undefined
                  : (e) =>
                      onChange?.({
                        ...params,
                        llmMaxTokens: parseFloat(e.target.value),
                      })
              }
              className={inputClass}
            />
          </Field>
        </section>

        <div className="h-px bg-slate-100" />

        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            Knowledge check
          </p>
          {(
            [
              "faithfulness",
              "citation_forcing",
              "counterfactual",
            ] as KnowledgeCheckStrategy[]
          ).map((strategy) => {
            const active = (params.knowledgeCheckStrategies ?? []).includes(
              strategy,
            );
            const labels: Record<KnowledgeCheckStrategy, string> = {
              faithfulness: "Faithfulness (RAGAS)",
              counterfactual: "Counterfactual",
              citation_forcing: "Citation forcing",
            };
            const infos: Record<KnowledgeCheckStrategy, string> = {
              faithfulness:
                "Checks whether each statement in the answer is supported by the retrieved sources.",
              counterfactual:
                "Tests resistance to false context by injecting contradictory information into the sources.",
              citation_forcing:
                "Forces the model to cite its sources and verifies that the citations are accurate.",
            };
            return (
              <Field
                key={strategy}
                label={labels[strategy]}
                info={infos[strategy]}
                techLink="/technical/knowledge-check"
              >
                <Toggle
                  checked={active}
                  onChange={(v) => {
                    if (readOnly) return;
                    const current = params.knowledgeCheckStrategies ?? [];
                    onChange?.({
                      ...params,
                      knowledgeCheckStrategies: v
                        ? [...current, strategy]
                        : current.filter((s) => s !== strategy),
                    });
                  }}
                  disabled={readOnly}
                />
              </Field>
            );
          })}
        </section>
      </div>
    </div>
  );
}

import type {
  ResponseGroundingResult,
  ResponseGroundingStrategy,
} from "../../../domain/entities/Message";
import type { ChunkSearchResult } from "../../../infra-ports/IChunkRepository";
import type { ILogger } from "../../../infra-ports/ILogger";
import type { ILLMPort } from "../../../infra-ports/ILLMPort";
import { checkCitationForcing } from "./strategies/citationForcing";
import { checkCounterfactual } from "./strategies/counterfactual";
import { checkFaithfulness } from "./strategies/faithfulness";

/** Orchestrates response quality check strategies (faithfulness, counterfactual, citation_forcing) and aggregates their results. */
export class CheckResponseGrounding {
  constructor(
    private readonly llm: ILLMPort,
    private readonly logger: ILogger,
  ) {}

  async run(
    query: string,
    answer: string,
    chunks: ChunkSearchResult[],
    strategies: ResponseGroundingStrategy[],
    titleById: Map<string, string> = new Map(),
  ): Promise<ResponseGroundingResult[]> {
    const results: ResponseGroundingResult[] = [];
    for (const strategy of strategies) {
      try {
        if (strategy === "faithfulness") {
          results.push(
            await checkFaithfulness(
              this.llm,
              this.logger,
              query,
              answer,
              chunks,
              titleById,
            ),
          );
        } else if (strategy === "counterfactual") {
          results.push(await checkCounterfactual(this.llm, query, answer));
        } else if (strategy === "citation_forcing") {
          results.push(
            await checkCitationForcing(
              this.llm,
              query,
              answer,
              chunks,
              titleById,
            ),
          );
        }
      } catch (err) {
        this.logger.warn(`Strategy '${strategy}' failed`, {
          error: String(err),
        });
        results.push({
          strategy,
          score: -1,
          claims: [],
          warning: `Check failed: ${String(err)}`,
        });
      }
    }
    return results;
  }
}

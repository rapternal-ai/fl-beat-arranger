import { ArrangementPlan, ArrangementRequest, arrangementRequestSchema } from "./schema";
import { generateArrangement, applyOverrides } from "./engine/generator";
import { validatePlan } from "./engine/validator";
import { exportJson } from "./exporters/json";
import { exportCsv } from "./exporters/csv";
import { exportPlaylistGuide } from "./exporters/playlist-guide";

/** Public interface contract (spec §9). Everything runs locally and synchronously. */
export function validateRequest(input: unknown): ArrangementRequest {
  return arrangementRequestSchema.parse(input);
}

export {
  generateArrangement,
  applyOverrides,
  validatePlan,
  exportJson,
  exportCsv,
  exportPlaylistGuide,
  type ArrangementPlan,
  type ArrangementRequest,
};

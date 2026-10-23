import { ArrangementPlan } from "../schema";

export function exportJson(plan: ArrangementPlan): string {
  return JSON.stringify(plan, null, 2);
}

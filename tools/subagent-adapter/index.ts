/**
 * subagent-adapter/index.ts
 *
 * Import this once (e.g. at orchestrator startup) so every provider
 * adapter registers itself with interface.ts's registry. Adding a new
 * provider = add the file + one import line here.
 */

import "./claude";
import "./codex";
import "./deepseek";
import "./gemini";

export {
  runSubAgent,
  loadSkillContent,
  loadRuleContent,
  registerProvider,
  registeredProviders,
  RULES_BY_SUBAGENT,
  SKILLS_BY_SUBAGENT,
  SUBAGENTS_REQUIRING_TOOL_USE,
} from "./interface";
export { writeHandoffLog, handoffDir } from "./handoff";
export type {
  AdapterCapabilities,
  ProviderAdapter,
  ProviderName,
  SubAgentName,
  SubAgentRequest,
  SubAgentResult,
} from "./interface";

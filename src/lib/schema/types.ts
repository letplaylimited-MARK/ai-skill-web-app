// TypeScript 数据模型 — 交接包统一 schema

export type SkillCode =
  | 'skill-00-navigator'
  | 'skill-01-prompt-engineer'
  | 'skill-02-sop-engineer'
  | 'skill-03-scout'
  | 'skill-04-planner'
  | 'skill-05-validator'
  | 'user';

export type HandoffType = 'HP-D' | 'HP-A' | 'HP-B' | 'HP-C' | 'HP-E' | 'HP-F';

export type ExecutionMode = 'A' | 'B' | 'C' | 'D' | 'E';

export type ApiProvider = 'claude' | 'openai';

export interface SelfReview {
  assumptions: string[];
  potential_failures: string[];
  predicted_deduction_by_s05: string;
}

export interface DownstreamNotes {
  to_skill: string;
  cautions: string[];
  required_verification: string[];
}

export interface Handoff {
  schema_version: '1.0' | '1.1';
  from_skill: SkillCode;
  to_skill: SkillCode;
  payload: Record<string, unknown>;
  user_action: string;
  created_at: string;
  self_review?: SelfReview;
  downstream_notes?: DownstreamNotes;
}

// HP-D: S00 → Any
export interface HpDPayload {
  intent_type: 'use_existing_skill' | 'find_open_source' | 'build_custom' | 'optimize_prompt' | 'deploy_project' | 'test_validate' | 'unclear';
  confidence_score: number;
  recommended_skill: SkillCode;
  routing_reason: string;
  project_summary: string;
  core_requirements: string[];
  pipeline: {
    full_path: SkillCode[];
    current_position: number;
  };
}

// HP-A: S01 → S02
export interface HpAPayload {
  optimized_prompts: {
    lite: string;
    standard: string;
    full: string;
  };
  quality_score: number;
  platform_constraints: string[];
  temperature_recommendation: number;
  test_cases: string[];
}

// HP-B: S03 → S02/04
export interface HpBPayload {
  recommended_tools: Array<{
    name: string;
    score: number;
    reason: string;
    repo_url?: string;
    license: string;
  }>;
  evaluation_matrix: Record<string, number>;
  gaps_found: string[];
  configuration_suggestions: string[];
}

// HP-C: S02 → S04
export interface HpCPayload {
  skill_package_summary: string;
  skill_md_description: string;
  engineering_stages_completed: number[];
  known_limitations: string[];
  design_decisions: string[];
  test_objectives: string[];
}

// HP-E: S04 → S05
export interface HpEPayload {
  operation_manual_title: string;
  phases: Array<{
    phase_number: number;
    phase_name: string;
    tasks: Array<{
      task_number: string;
      description: string;
      steps: string[];
    }>;
  }>;
  environment_requirements: string[];
  prerequisites: string[];
  breakpoint_recovery: string;
}

// HP-F: S05 → User
export interface HpFPayload {
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  overall_score: number;
  dimension_scores: Record<string, number>;
  defects: Array<{
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    description: string;
    location: string;
    fix_suggestion: string;
  }>;
  upstream_feedback: string;
  release_recommendation: string;
}

// 执行状态
export type ExecutionState = 'pending' | 'in_progress' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'success' | 'error';

export interface ExecutionStep {
  id: string;
  stepNumber: number;
  skillCode: SkillCode;
  status: StepStatus;
  inputHandoff: Handoff;
  outputHandoff?: Handoff;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ExecutionRecord {
  id: string;
  projectId?: string;
  userInput: string;
  mode: ExecutionMode;
  state: ExecutionState;
  currentSkill?: SkillCode;
  councilPassed: boolean;
  apiProvider: ApiProvider;
  modelName?: string;
  steps: ExecutionStep[];
  councilReport?: CouncilPackage;
  finalReport?: string;
  createdAt: string;
  updatedAt: string;
}

// 圆桌预检数据结构
export interface CouncilMemberVoice {
  skill_code: SkillCode;
  role_name: string;
  perspective: string;
  capability_can: string[];
  capability_cannot: string[];
  execution_warnings: string[];
  questions_to_siblings: string[];
  risk_level: 'low' | 'medium' | 'high';
}

export interface CouncilPackage {
  schema_version: '1.0';
  session_id: string;
  triggered_by: string;
  requirement_summary: string;
  voices: CouncilMemberVoice[];
  consensus: {
    recommended_path: SkillCode[];
    highest_risks: string[];
    p0_gate: boolean;
    p0_reason?: string;
    decision: 'proceed' | 'adjust' | 'clarify';
  };
  created_at: string;
}

// API 请求/响应类型
export interface InitializeRequest {
  user_input: string;
  mode: ExecutionMode;
  api_provider: ApiProvider;
  model_name?: string;
  api_key_override?: string;
}

export interface InitializeResponse {
  execution_id: string;
  current_handoff: Handoff;
  next_action: 'council_review' | 'skill_execution' | 'user_input';
  next_skill?: SkillCode;
}

export interface ExecuteSkillRequest {
  handoff: Handoff;
  user_approved?: boolean;
  user_edited_handoff?: Partial<Handoff>;
}

export interface ExecuteSkillResponse {
  execution_id: string;
  step_id: string;
  next_skill?: SkillCode;
  output_handoff: Handoff;
  execution_trace: ExecutionStep[];
  is_complete: boolean;
}

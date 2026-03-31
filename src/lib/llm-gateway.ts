import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import type { Handoff, SkillCode, ApiProvider } from './schema/types';

// 加载 Skill 系统提示词
function loadSkillPrompt(skillCode: SkillCode): string {
  const shortCode = skillCode.replace('skill-0', 's0').split('-')[0];
  const promptFile = path.join(process.cwd(), 'src/lib/skill-prompts', `${shortCode}.txt`);
  try {
    return fs.readFileSync(promptFile, 'utf-8');
  } catch {
    // fallback: 根据 skillCode 推断文件名
    const match = skillCode.match(/skill-(\d+)/);
    if (match) {
      const num = match[1];
      const fallbackFile = path.join(process.cwd(), 'src/lib/skill-prompts', `s${num}.txt`);
      return fs.readFileSync(fallbackFile, 'utf-8');
    }
    throw new Error(`System prompt not found for skill: ${skillCode}`);
  }
}

// 从 AI 响应中提取 YAML 交接包
function extractHandoffFromResponse(response: string): Handoff {
  // 策略1: 提取 ```yaml ... ``` 代码块
  const yamlMatch = response.match(/```ya?ml\n([\s\S]*?)```/i);
  if (yamlMatch) {
    try {
      const parsed = parseYaml(yamlMatch[1]);
      if (parsed?.handoff) return parsed.handoff as Handoff;
    } catch (e) {
      console.warn('YAML block parse failed, trying fallback', e);
    }
  }

  // 策略2: 找到 handoff: 开头的内容
  const handoffMatch = response.match(/handoff:\s*\n([\s\S]*?)(?:\n---|\n```|$)/);
  if (handoffMatch) {
    try {
      const parsed = parseYaml('handoff:\n' + handoffMatch[1]);
      if (parsed?.handoff) return parsed.handoff as Handoff;
    } catch (e) {
      console.warn('Handoff extraction fallback failed', e);
    }
  }

  // 策略3: 创建一个基础的 fallback 交接包（解析失败时）
  const now = new Date().toISOString().split('T')[0];
  return {
    schema_version: '1.1',
    from_skill: 'skill-00-navigator' as SkillCode,
    to_skill: 'user' as SkillCode,
    payload: {
      raw_response: response,
      parse_error: 'Could not extract structured handoff from AI response',
    },
    user_action: '请查看 AI 原始输出',
    created_at: now,
  };
}

// 组装用户消息（将交接包作为上下文）
function assembleUserMessage(incomingHandoff: Handoff | null, userInput: string): string {
  if (!incomingHandoff) {
    return userInput;
  }
  
  const yamlContext = JSON.stringify(incomingHandoff, null, 2);
  return `【接收到的交接包】
\`\`\`json
${yamlContext}
\`\`\`

【用户补充说明】
${userInput}

请根据以上交接包中的内容和用户说明，完成你的职责并输出标准化 YAML 交接包。`;
}

// Claude API 调用
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  modelName?: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: modelName || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  
  const content = response.content[0];
  if (content.type === 'text') return content.text;
  throw new Error('Unexpected Claude response type');
}

// OpenAI API 调用
async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  modelName?: string
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: modelName || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 4096,
  });
  
  return response.choices[0]?.message?.content || '';
}

// 主 Gateway 函数
export interface LlmGatewayOptions {
  skillCode: SkillCode;
  incomingHandoff: Handoff | null;
  userInput: string;
  apiProvider: ApiProvider;
  apiKey: string;
  modelName?: string;
}

export interface LlmGatewayResult {
  raw_response: string;
  output_handoff: Handoff;
  duration_ms: number;
}

export async function executeSkillViaLlm(options: LlmGatewayOptions): Promise<LlmGatewayResult> {
  const startTime = Date.now();
  
  // 加载系统提示词
  const systemPrompt = loadSkillPrompt(options.skillCode);
  
  // 组装用户消息
  const userMessage = assembleUserMessage(options.incomingHandoff, options.userInput);
  
  // 调用 AI
  let rawResponse: string;
  if (options.apiProvider === 'claude') {
    rawResponse = await callClaude(systemPrompt, userMessage, options.apiKey, options.modelName);
  } else {
    rawResponse = await callOpenAI(systemPrompt, userMessage, options.apiKey, options.modelName);
  }
  
  // 提取交接包
  const outputHandoff = extractHandoffFromResponse(rawResponse);
  
  return {
    raw_response: rawResponse,
    output_handoff: outputHandoff,
    duration_ms: Date.now() - startTime,
  };
}

// 获取 API Key（优先使用用户输入，回退到环境变量）
export function resolveApiKey(provider: ApiProvider, userOverride?: string): string {
  if (userOverride && userOverride.trim()) return userOverride.trim();
  
  if (provider === 'claude') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) return key;
    throw new Error('ANTHROPIC_API_KEY not configured. Please add it in Settings or .env file.');
  }
  
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (key) return key;
    throw new Error('OPENAI_API_KEY not configured. Please add it in Settings or .env file.');
  }
  
  throw new Error(`Unknown API provider: ${provider}`);
}

// Pipeline 路由：根据 HP-D 确定下一个要执行的 Skill
export function resolveNextSkill(currentHandoff: Handoff): SkillCode | null {
  const { to_skill } = currentHandoff;
  if (to_skill === 'user') return null;
  return to_skill as SkillCode;
}

// 根据模式和当前 Skill 确定是否需要停止让用户审查
export function needsUserApproval(mode: string, skillCode: SkillCode): boolean {
  // 模式 A: 单 Skill，执行完即停
  // 模式 B: 协调官入口，每步停下来
  // 模式 C: Pipeline，全自动
  // 模式 D: 圆桌 + 单 Skill，圆桌后停
  // 模式 E: 深度精炼，每步停下来审查
  switch (mode) {
    case 'A': return true;  // 单Skill执行完停
    case 'B': return true;  // 每步都审查
    case 'C': return false; // 全自动流水线
    case 'D': return skillCode === 'skill-00-navigator'; // 圆桌后停
    case 'E': return true;  // 深度精炼，每步审查
    default:  return true;
  }
}

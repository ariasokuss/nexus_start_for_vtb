// Типы ответов API. Держим в синхроне с backend/app/schemas.py и docs/api.md.

export type RiskLevel = 'high' | 'medium' | 'low'

export interface Persona {
  id: string
  name: string
  age: number
  balance: number
  description: string
}

export interface Transaction {
  id: string
  ts: string
  amount: number
  direction: 'in' | 'out'
  counterparty: string
  is_new_counterparty: boolean
  channel: string
  frozen: boolean
}

export interface ChatMessage {
  sender: 'recruiter' | 'user' | 'system'
  text: string
}

export interface DemoStep {
  id: string
  title: string
  hint: string
  chat: ChatMessage[]
  expect: Record<string, unknown> | null
}

export interface LiveRisk {
  persona_id: string
  score: number
  level: RiskLevel
  signals: string[]
}

export interface DemoState {
  scenario_id: string
  persona: Persona
  step_index: number
  steps_count: number
  step: DemoStep
  chat_history: ChatMessage[]
  risk: LiveRisk
}

export interface ScenarioInfo {
  id: string
  persona: string
  title: string
  steps_count: number
}

export type InterceptAction = 'cancel' | 'offered_job' | 'check_message' | 'continue'

export interface TransferResponse {
  status: 'ok' | 'intercepted'
  risk: { score: number; level: RiskLevel; reasons: string[] }
  intercept: {
    title: string
    text: string
    consequences: string[]
    actions: InterceptAction[]
  } | null
  balance: number
}

export interface SosStep {
  text: string
  action: string | null
  legal: string | null
}

export interface SosBranch {
  id: 'A' | 'B' | 'C' | 'D'
  title: string
  steps: SosStep[]
}

import type {
  AssistantReply,
  DemoState,
  Lesson,
  LiveRisk,
  OperationResponse,
  Persona,
  ScenarioInfo,
  ShieldResult,
  SosBranch,
  Transaction,
  TransferResponse,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* не JSON */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Ошибка запроса')
  }
  return res.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })

export const api = {
  scenarios: () => request<ScenarioInfo[]>('/api/demo/scenarios'),
  demoState: (id: string) => request<DemoState>(`/api/demo/${id}`),
  demoReset: (id: string) => post<DemoState>(`/api/demo/${id}/reset`),
  demoNext: (id: string) => post<DemoState>(`/api/demo/${id}/next`),

  personas: () => request<Persona[]>('/api/personas'),
  resetPersona: (personaId: string) => post<Persona>(`/api/personas/${personaId}/reset`),
  transactions: (personaId: string) => request<Transaction[]>(`/api/personas/${personaId}/transactions`),
  liveRisk: (personaId: string) => request<LiveRisk>(`/api/risk/${personaId}/live`),

  topup: (personaId: string, sender: string, amount: number) =>
    post<OperationResponse>('/api/payments/topup', { persona_id: personaId, sender, amount }),
  pay: (personaId: string, merchant: string, category: string, amount: number) =>
    post<OperationResponse>('/api/payments/pay', { persona_id: personaId, merchant, category, amount }),
  transfer: (personaId: string, to: string, amount: number, confirmed = false) =>
    post<TransferResponse>('/api/payments/transfer', { persona_id: personaId, to, amount, confirmed }),

  sosBranches: () => request<SosBranch[]>('/api/sos/branches'),
  returnFunds: (personaId: string, operationId: string) =>
    post<{ claim_id: string; frozen_amount: number; status: string }>('/api/sos/return-funds', {
      persona_id: personaId,
      operation_id: operationId,
    }),
  pauseOutgoing: (personaId: string) => post('/api/sos/pause-outgoing', { persona_id: personaId }),
  sosAction: (personaId: string, action: string) =>
    post<{ result: string }>('/api/sos/action', { persona_id: personaId, action }),

  shield: (text: string) => post<ShieldResult>('/api/shield/check', { text }),
  event: (personaId: string, type: string) =>
    post<{ lesson: Lesson | null }>('/api/events', { persona_id: personaId, type }),
  progress: (personaId: string, lessonId: string) =>
    post<{ xp: number; level: number }>('/api/progress', { persona_id: personaId, lesson_id: lessonId }),

  assistant: (personaId: string, message: string, history: { role: string; text: string }[]) =>
    post<AssistantReply>('/api/assistant/chat', { persona_id: personaId, message, history }),
}

import type { DemoState, Persona, ScenarioInfo, SosBranch, Transaction, TransferResponse } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })

export const api = {
  scenarios: () => request<ScenarioInfo[]>('/api/demo/scenarios'),
  demoState: (id: string) => request<DemoState>(`/api/demo/${id}`),
  demoReset: (id: string) => post<DemoState>(`/api/demo/${id}/reset`),
  demoNext: (id: string) => post<DemoState>(`/api/demo/${id}/next`),
  demoStreamUrl: (id: string) => `/api/demo/${id}/stream`,

  personas: () => request<Persona[]>('/api/personas'),
  transactions: (personaId: string) => request<Transaction[]>(`/api/personas/${personaId}/transactions`),
  transfer: (personaId: string, to: string, amount: number) =>
    post<TransferResponse>('/api/payments/transfer', { persona_id: personaId, to, amount }),

  sosBranches: () => request<SosBranch[]>('/api/sos/branches'),
  returnFunds: (personaId: string, operationId: string) =>
    post<{ claim_id: string; frozen_amount: number; status: string }>('/api/sos/return-funds', {
      persona_id: personaId,
      operation_id: operationId,
    }),
  pauseOutgoing: (personaId: string) => post('/api/sos/pause-outgoing', { persona_id: personaId }),
}

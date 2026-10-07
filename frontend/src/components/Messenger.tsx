import type { ChatMessage } from '../api/types'

// Фейковый мессенджер с вербовщиком. TODO(Маша): аватар, время, «печатает…», анимация появления.
export default function Messenger({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-[#e7ebf0] p-3">
      <div className="mb-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold">💼 Работа | Подработка</div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {messages.map((m, i) =>
          m.sender === 'system' ? (
            <div key={i} className="self-center rounded-full bg-black/10 px-3 py-1 text-xs text-slate-600">
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.sender === 'user' ? 'self-end bg-[#dcf8c6]' : 'self-start bg-white'
              }`}
            >
              {m.text}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-[720px] w-[360px] overflow-hidden rounded-[2.5rem] border-[10px] border-slate-900 bg-white shadow-2xl">
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  )
}

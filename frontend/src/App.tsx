import { Navigate, Route, Routes } from 'react-router-dom'

import AppPage from './app/AppPage'
import DemoHome from './demo/DemoHome'
import DemoPage from './demo/DemoPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/demo" replace />} />
      <Route path="/demo" element={<DemoHome />} />
      <Route path="/demo/:scenarioId" element={<DemoPage />} />
      <Route path="/app" element={<AppPage />} />
    </Routes>
  )
}

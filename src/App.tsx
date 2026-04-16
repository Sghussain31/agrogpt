import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AIAssistantPill } from './components/AIAssistantPill'
import { AuthGuard } from './components/AuthGuard'
import { DashboardPage } from './pages/DashboardPage'
import { FieldVisionPage } from './pages/FieldVisionPage'
import { PrecisionPlanningPage } from './pages/PrecisionPlanningPage'
import { DigitalLedgerPage } from './pages/DigitalLedgerPage'
import { MarketPostHarvestPage } from './pages/MarketPostHarvestPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { Auth } from './pages/Auth'

function ProtectedShell() {
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <AIAssistantPill />
    </>
  )
}

export default function App() {
  return (
    <div className="agro-bg min-h-screen">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<AuthGuard />}>
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/field-vision" element={<FieldVisionPage />} />
            <Route path="/precision-planning" element={<PrecisionPlanningPage />} />
            <Route path="/digital-ledger" element={<DigitalLedgerPage />} />
            <Route path="/market" element={<MarketPostHarvestPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

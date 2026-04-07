import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { ProtectedLayout } from './layouts/ProtectedLayout'
import { QueuePage } from './pages/QueuePage'
import { CasePage } from './pages/CasePage'
import { LoginPage } from './pages/LoginPage'
import { BusinessKycPage } from './pages/BusinessKycPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { ComplianceSettingsPage } from './pages/ComplianceSettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<AppShell />}>
            <Route index element={<QueuePage />} />
            <Route path="case/:id" element={<CasePage />} />
            <Route path="customers" element={<BusinessKycPage />} />
            <Route path="reports" element={<IncidentsPage />} />
            <Route path="settings" element={<ComplianceSettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

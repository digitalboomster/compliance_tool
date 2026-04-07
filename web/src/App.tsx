import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { QueuePage } from './pages/QueuePage'
import { CasePage } from './pages/CasePage'
import { BusinessKycPage } from './pages/BusinessKycPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { ComplianceSettingsPage } from './pages/ComplianceSettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<QueuePage />} />
          <Route path="case/:id" element={<CasePage />} />
          <Route path="customers" element={<BusinessKycPage />} />
          <Route path="reports" element={<IncidentsPage />} />
          <Route path="settings" element={<ComplianceSettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

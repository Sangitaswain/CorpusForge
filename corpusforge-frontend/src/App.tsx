import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import LandingPage from './pages/LandingPage';
import WorkspaceAccessPage from './pages/WorkspaceAccessPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import CopilotPage from './pages/CopilotPage';
import GraphPage from './pages/GraphPage';
import IntelligencePage from './pages/IntelligencePage';
import AlertsPage from './pages/AlertsPage';
import DocumentViewerPage from './pages/DocumentViewerPage';

function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/ask-forge" element={<CopilotPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/document-viewer" element={<DocumentViewerPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/access" element={<WorkspaceAccessPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

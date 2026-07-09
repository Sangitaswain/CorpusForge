import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import CopilotPage from './pages/CopilotPage';
import GraphPage from './pages/GraphPage';
import IntelligencePage from './pages/IntelligencePage';
import AlertsPage from './pages/AlertsPage';
import DocumentViewerPage from './pages/DocumentViewerPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/document-viewer" element={<DocumentViewerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

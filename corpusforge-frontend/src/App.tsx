import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import DocumentsPage from './pages/DocumentsPage';
import CopilotPage from './pages/CopilotPage';
import GraphPage from './pages/GraphPage';
import IntelligencePage from './pages/IntelligencePage';
import AlertsPage from './pages/AlertsPage';

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/copilot" replace />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Recording from './components/Recording';
import Results from './components/Results';
import SavedRecordings from './components/SavedRecordings';
import Settings from './components/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/record" element={<Recording />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/saved" element={<SavedRecordings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

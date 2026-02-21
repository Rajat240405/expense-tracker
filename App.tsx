import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GroupProvider } from './contexts/GroupContext';
import Landing from './components/Landing';
import Workspace from './components/Workspace';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallbackPage from './pages/AuthCallbackPage';
import JoinGroupPage from './pages/JoinGroupPage';

function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onEnter={() => navigate('/workspace')} />;
}

function WorkspaceRoute() {
  const navigate = useNavigate();
  return <Workspace onBack={() => navigate('/')} />;
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          <div className="min-h-screen w-full bg-[#080c14] text-gray-100">
            <Routes>
              <Route path="/" element={<LandingRoute />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/join/:token" element={<JoinGroupPage />} />
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <WorkspaceRoute />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<LandingRoute />} />
            </Routes>
          </div>
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
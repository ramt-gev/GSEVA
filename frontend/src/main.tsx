import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import { queryClient } from './lib/queryClient';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Mirrors frontend-admin's pattern: only mount GoogleOAuthProvider when a
// client ID is actually configured — the provider throws at init otherwise.
function Providers({ children }: { children: React.ReactNode }) {
  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider> : content;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>
);

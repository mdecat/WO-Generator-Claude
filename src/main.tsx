import React from 'react';
import ReactDOM from 'react-dom/client';
import { isXrmContext } from './xrmContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);

async function bootstrap() {
  const { FluentProvider, webLightTheme } = await import('@fluentui/react-components');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { XrmAuthProvider, MsalAuthProvider } = await import('./auth/AuthContext');

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });

  if (isXrmContext()) {
    // ── XRM mode: D365 session handles auth — no MSAL needed ──────────────────
    const { AppXrm } = await import('./AppXrm');

    root.render(
      <React.StrictMode>
        <FluentProvider theme={webLightTheme}>
          <QueryClientProvider client={queryClient}>
            <XrmAuthProvider>
              <AppXrm />
            </XrmAuthProvider>
          </QueryClientProvider>
        </FluentProvider>
      </React.StrictMode>
    );
  } else {
    // ── Standalone mode: MSAL authentication ──────────────────────────────────
    const { PublicClientApplication } = await import('@azure/msal-browser');
    const { MsalProvider } = await import('@azure/msal-react');
    const { msalConfig } = await import('./authConfig');
    const App = (await import('./App')).default;

    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();

    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <FluentProvider theme={webLightTheme}>
            <QueryClientProvider client={queryClient}>
              <MsalAuthProvider>
                <App msalInstance={msalInstance} />
              </MsalAuthProvider>
            </QueryClientProvider>
          </FluentProvider>
        </MsalProvider>
      </React.StrictMode>
    );
  }
}

bootstrap();

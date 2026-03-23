import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'common';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (import.meta.env.DEV) {
          switch (level) {
            case LogLevel.Error: console.error(message); break;
            case LogLevel.Warning: console.warn(message); break;
            case LogLevel.Info: console.info(message); break;
            case LogLevel.Verbose: console.debug(message); break;
          }
        }
      },
      piiLoggingEnabled: false,
      logLevel: import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error,
    },
  },
};

/** Discovery API scope — used to enumerate tenant environments */
export const DISCOVERY_SCOPE = 'https://globaldisco.crm.dynamics.com/user_impersonation';
export const DISCOVERY_BASE_URL = 'https://globaldisco.crm.dynamics.com/api/discovery/v2.0';

/** Build Dataverse scopes for a specific org URL */
export const getDataverseScopes = (orgUrl: string): string[] => {
  const base = orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl;
  return [`${base}/user_impersonation`];
};

/** Default org URL from env */
export const DEFAULT_ORG_URL =
  import.meta.env.VITE_DEFAULT_ORG_URL || 'https://decat.crm.dynamics.com';

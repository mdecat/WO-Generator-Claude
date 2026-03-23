/**
 * Utilities for detecting and interacting with the Dynamics 365 / Xrm context.
 * When the app runs inside D365 as a web resource, window.Xrm is available
 * and authentication is handled by the existing D365 session — no MSAL needed.
 */

// Module-level override for the Xrm base URL.
// Used when the user manually switches the target environment while running inside D365.
let _xrmBaseUrlOverride = '';

/** Override the base URL used for Dataverse API calls in XRM mode. */
export function setXrmBaseUrlOverride(url: string): void {
  _xrmBaseUrlOverride = url.endsWith('/') ? url.slice(0, -1) : url;
}

declare global {
  interface Window {
    Xrm?: {
      WebApi: {
        online: {
          retrieveMultipleRecords(
            entityName: string,
            options?: string,
            maxPageSize?: number
          ): Promise<{ entities: Record<string, unknown>[]; nextLink?: string }>;
          retrieveRecord(
            entityName: string,
            id: string,
            options?: string
          ): Promise<Record<string, unknown>>;
          createRecord(
            entityName: string,
            data: Record<string, unknown>
          ): Promise<{ id: string; entityType: string }>;
        };
      };
      Utility: {
        getGlobalContext(): {
          getClientUrl(): string;
          getUserName(): string;
          getUserId(): string;
        };
      };
    };
  }
}

/**
 * Returns true when running inside D365 as a web resource.
 * Primary signal: window.Xrm (injected by D365 UCI shell).
 * Fallback: hostname pattern (.crm*.dynamics.com) — covers cases where Xrm
 * hasn't been injected yet or isn't available in the current frame.
 */
export function isXrmContext(): boolean {
  if (typeof window === 'undefined') return false;
  // Build-time flag: set by deploy.mjs when building for D365 web resource deployment.
  // Eliminates all runtime guessing — the deployed bundle always uses XRM mode.
  if (import.meta.env.VITE_FORCE_XRM === 'true') return true;
  // Runtime detection fallbacks (used in dev / standalone builds)
  if (window.Xrm !== undefined && window.Xrm.Utility !== undefined) return true;
  return /\.dynamics\.com$/.test(window.location.hostname);
}

/** Returns the Dataverse org base URL. */
export function getXrmBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  // Manual override (e.g. user switched environment from the org pill)
  if (_xrmBaseUrlOverride) return _xrmBaseUrlOverride;
  // window.Xrm available: use the authoritative API
  if (window.Xrm?.Utility) {
    const url = window.Xrm.Utility.getGlobalContext().getClientUrl();
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
  // Fallback: derive org URL from window.location (always correct for web resources)
  return window.location.origin;
}

/** Returns the signed-in user's display name from the Xrm context, or '' if unavailable. */
export function getXrmUserName(): string {
  if (!isXrmContext()) return '';
  try {
    return window.Xrm?.Utility?.getGlobalContext()?.getUserName() ?? '';
  } catch {
    return '';
  }
}

/**
 * Dataverse API client — works in two modes:
 *   1. XRM mode (inside D365 web resource): fetch + session cookie, no token needed
 *   2. Standalone mode: axios + MSAL bearer token
 */
import axios from 'axios';
import { type IPublicClientApplication } from '@azure/msal-browser';
import { getDataverseScopes } from '../authConfig';
import { isXrmContext, getXrmBaseUrl } from '../xrmContext';

// ─── Standalone MSAL state ───────────────────────────────────────────────────

let _msalInstance: IPublicClientApplication | null = null;
let _orgUrl: string = '';

export function initDataverseClient(msal: IPublicClientApplication, orgUrl: string) {
  _msalInstance = msal;
  _orgUrl = orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl;
}

export function getOrgUrl(): string {
  return isXrmContext() ? getXrmBaseUrl() : _orgUrl;
}

// ─── MSAL token acquisition ──────────────────────────────────────────────────

async function acquireToken(scopes: string[]): Promise<string> {
  if (!_msalInstance) throw new Error('MSAL not initialized');
  const accounts = _msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error('No signed-in account');
  try {
    const result = await _msalInstance.acquireTokenSilent({ scopes, account: accounts[0] });
    return result.accessToken;
  } catch {
    const result = await _msalInstance.acquireTokenPopup({ scopes });
    return result.accessToken;
  }
}

// ─── XRM fetch helper ────────────────────────────────────────────────────────
// When running inside D365, the browser session cookie authenticates requests
// automatically — no Authorization header needed.

async function xrmFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const resp = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Prefer: 'odata.include-annotations="*"',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const body = await resp.clone().json();
      msg = body?.error?.message ?? msg;
    } catch { /* ignore */ }
    // Mimic axios error shape so workOrderApi error handling works uniformly
    const err = Object.assign(new Error(msg), {
      response: {
        status: resp.status,
        data: { error: { message: msg, code: String(resp.status) } },
      },
    });
    throw err;
  }

  return resp;
}

function buildXrmUrl(path: string, params?: Record<string, string>): string {
  const base = getXrmBaseUrl();
  let url = path.startsWith('http') ? path : `${base}/api/data/v9.2${path}`;
  if (params) {
    // OData system query values must NOT be fully encoded — $expand nested syntax
    // like `msdyn_characteristic($select=msdyn_name)` breaks if ( ) $ are percent-encoded.
    // Only encode characters that would break URL structure (&, #, space).
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${v.replace(/&/g, '%26').replace(/#/g, '%23').replace(/ /g, '%20')}`)
      .join('&');
    url += '?' + qs;
  }
  return url;
}

// ─── Public API functions ─────────────────────────────────────────────────────

/** Generic GET — works in both XRM and standalone contexts */
export async function dvGet<T>(
  urlOrPath: string,
  params?: Record<string, string>,
  orgUrl?: string
): Promise<T> {
  if (isXrmContext()) {
    const url = buildXrmUrl(urlOrPath, params);
    const resp = await xrmFetch(url);
    return resp.json() as Promise<T>;
  }

  // Standalone: axios + MSAL
  const base = orgUrl ?? _orgUrl;
  const scopes = getDataverseScopes(base);
  const token = await acquireToken(scopes);
  const apiBase = `${base}/api/data/v9.2`;
  const path = urlOrPath.startsWith('http') ? urlOrPath.replace(apiBase, '') : urlOrPath;

  const resp = await axios.get<T>(`${apiBase}${path}`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="*"',
    },
  });
  return resp.data;
}

/** Generic POST — returns the created/updated entity body */
export async function dvPost<T>(
  path: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
  orgUrl?: string
): Promise<T> {
  if (isXrmContext()) {
    const url = buildXrmUrl(path);
    const resp = await xrmFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        Prefer: 'return=representation',
        ...extraHeaders,
      },
    });
    // 204 No Content (no body) is valid for some POST ops
    if (resp.status === 204) return {} as T;
    return resp.json() as Promise<T>;
  }

  // Standalone: axios + MSAL
  const base = orgUrl ?? _orgUrl;
  const scopes = getDataverseScopes(base);
  const token = await acquireToken(scopes);

  const resp = await axios.post<T>(`${base}/api/data/v9.2${path}`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      Prefer: 'return=representation',
      ...extraHeaders,
    },
  });
  return resp.data;
}

/** For direct axios instance (legacy — used only in standalone batch operations) */
export async function createDataverseAxios(orgUrl?: string) {
  const base = orgUrl ?? _orgUrl;
  const scopes = getDataverseScopes(base);
  const token = await acquireToken(scopes);

  return axios.create({
    baseURL: `${base}/api/data/v9.2`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="*"',
    },
  });
}

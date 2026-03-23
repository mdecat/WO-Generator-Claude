/**
 * Abstract authentication context.
 * Provides the same interface whether running inside D365 (Xrm) or standalone (MSAL).
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { getXrmUserName } from '../xrmContext';
import { dvGet } from '../api/dataverseClient';

export interface AuthUser {
  name?: string;
  username?: string;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signOut: () => void;
  signIn: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  signOut: () => {},
  signIn: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─── Xrm Provider ────────────────────────────────────────────────────────────
// Used when running inside D365 — user is already authenticated via session.

export function XrmAuthProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>(() => getXrmUserName());

  useEffect(() => {
    // window.Xrm may now be available (deferred injection by D365 UCI)
    const fromXrm = getXrmUserName();
    if (fromXrm) { setUserName(fromXrm); return; }
    // Fallback: Dataverse WhoAmI → systemuser fullname
    dvGet<{ UserId: string }>('/WhoAmI')
      .then(({ UserId }) =>
        dvGet<{ fullname: string }>(`/systemusers(${UserId})`, { $select: 'fullname' })
      )
      .then(u => { if (u.fullname) setUserName(u.fullname); })
      .catch(() => { /* keep whatever is in state */ });
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: true,
    user: { name: userName || 'D365 User' },
    signOut: () => {},
    signIn: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── MSAL Provider ───────────────────────────────────────────────────────────
// Used when running standalone — wraps useMsal() to provide the same interface.
// This component must be rendered inside a <MsalProvider>.

export function MsalAuthProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const value: AuthContextValue = {
    isAuthenticated,
    user: accounts[0] ?? null,
    signOut: () => {
      instance.logoutPopup({ account: accounts[0] });
    },
    signIn: () => {
      instance.loginPopup({
        scopes: ['User.Read', 'openid', 'profile'],
        prompt: 'select_account',
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

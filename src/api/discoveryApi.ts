import axios from 'axios';
import { type IPublicClientApplication } from '@azure/msal-browser';
import { DISCOVERY_BASE_URL, DISCOVERY_SCOPE } from '../authConfig';
import type { DataverseEnvironment } from '../types/dataverse';

/** Discover all Dataverse environments accessible to the signed-in user */
export async function discoverEnvironments(
  msal: IPublicClientApplication
): Promise<DataverseEnvironment[]> {
  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) throw new Error('No signed-in account');

  let token: string;
  try {
    const result = await msal.acquireTokenSilent({
      scopes: [DISCOVERY_SCOPE],
      account: accounts[0],
    });
    token = result.accessToken;
  } catch {
    const result = await msal.acquireTokenPopup({ scopes: [DISCOVERY_SCOPE] });
    token = result.accessToken;
  }

  const resp = await axios.get<{ value: DataverseEnvironment[] }>(
    `${DISCOVERY_BASE_URL}/Instances`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  return resp.data.value ?? [];
}

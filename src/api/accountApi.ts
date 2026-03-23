import { dvGet } from './dataverseClient';
import type { ODataResponse } from '../types/dataverse';
import type { ServiceAccount } from '../types/fieldService';
import type { FilterCondition, AccountQueryResult } from '../types/generator';

const BASE_SELECT =
  'accountid,name,address1_latitude,address1_longitude,address1_line1,' +
  'address1_city,address1_stateorprovince,address1_postalcode,address1_country,' +
  '_msdyn_serviceterritory_value,_transactioncurrencyid_value,_defaultpricelevelid_value';

const BASE_FILTER = 'address1_latitude ne null and address1_longitude ne null';

/** Build OData $filter string from user-defined conditions */
export function buildODataFilter(conditions: FilterCondition[]): string {
  if (conditions.length === 0) return BASE_FILTER;

  const conditionStrings = conditions
    .filter((c) => c.value.trim() !== '')
    .map((c) => {
      const val = c.value.replace(/'/g, "''"); // escape single quotes
      switch (c.operator) {
        case 'eq':
          return `${c.field} eq '${val}'`;
        case 'ne':
          return `${c.field} ne '${val}'`;
        case 'contains':
          return `contains(${c.field},'${val}')`;
        case 'startswith':
          return `startswith(${c.field},'${val}')`;
        case 'endswith':
          return `endswith(${c.field},'${val}')`;
        case 'gt':
          return `${c.field} gt ${val}`;
        case 'lt':
          return `${c.field} lt ${val}`;
        default:
          return '';
      }
    })
    .filter(Boolean);

  const combined =
    conditionStrings.length > 0
      ? `(${conditionStrings.join(') and (')}) and `
      : '';

  return `${combined}${BASE_FILTER}`;
}

/** Fetch accounts with lat/long based on filter conditions */
export async function queryAccounts(
  conditions: FilterCondition[],
  top = 500,
  orgUrl?: string
): Promise<AccountQueryResult> {
  const filter = buildODataFilter(conditions);

  const resp = await dvGet<ODataResponse<ServiceAccount>>(
    '/accounts',
    {
      $select: BASE_SELECT,
      $filter: filter,
      $orderby: 'name asc',
      $top: String(top),
      $count: 'true',
    },
    orgUrl
  );

  return {
    accounts: resp.value ?? [],
    totalCount: resp['@odata.count'] ?? resp.value?.length ?? 0,
    hasMore: !!resp['@odata.nextLink'],
    nextLink: resp['@odata.nextLink'],
  };
}

/** Fetch next page of accounts */
export async function fetchNextPage(
  nextLink: string,
  orgUrl?: string
): Promise<AccountQueryResult> {
  const resp = await dvGet<ODataResponse<ServiceAccount>>(nextLink, undefined, orgUrl);
  return {
    accounts: resp.value ?? [],
    totalCount: resp['@odata.count'] ?? 0,
    hasMore: !!resp['@odata.nextLink'],
    nextLink: resp['@odata.nextLink'],
  };
}

/** Fetch a single account by ID (to get price list etc.) */
export async function getAccount(
  accountId: string,
  orgUrl?: string
): Promise<ServiceAccount> {
  return dvGet<ServiceAccount>(
    `/accounts(${accountId})`,
    { $select: BASE_SELECT },
    orgUrl
  );
}

/** Get all accounts at once (for map display — capped at 2000) */
export async function getAllAccountsForMap(
  conditions: FilterCondition[],
  orgUrl?: string
): Promise<ServiceAccount[]> {
  const result = await queryAccounts(conditions, 2000, orgUrl);
  return result.accounts;
}

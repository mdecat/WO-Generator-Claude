import { dvGet } from './dataverseClient';
import type { ODataResponse } from '../types/dataverse';
import type { WorkOrderType, Priority, PriceList } from '../types/fieldService';

/** Fetch all Work Order Types */
export async function getWorkOrderTypes(orgUrl?: string): Promise<WorkOrderType[]> {
  const resp = await dvGet<ODataResponse<WorkOrderType>>(
    '/msdyn_workordertypes',
    {
      $select: 'msdyn_workordertypeid,msdyn_name',
      $orderby: 'msdyn_name asc',
      $top: '200',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Fetch all Priorities */
export async function getPriorities(orgUrl?: string): Promise<Priority[]> {
  const resp = await dvGet<ODataResponse<Priority>>(
    '/msdyn_priorities',
    {
      $select: 'msdyn_priorityid,msdyn_name',
      $top: '200',
    },
    orgUrl
  ).catch(() => ({ value: [] as Priority[] }));
  return resp.value ?? [];
}

/** Fetch all Price Lists */
export async function getPriceLists(orgUrl?: string): Promise<PriceList[]> {
  const resp = await dvGet<ODataResponse<PriceList>>(
    '/pricelevels',
    {
      $select: 'pricelevelid,name',
      $filter: 'statecode eq 0',
      $orderby: 'name asc',
      $top: '200',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Get the default price list for an org (first active one, if any) */
export async function getDefaultPriceList(orgUrl?: string): Promise<PriceList | null> {
  const lists = await getPriceLists(orgUrl);
  return lists[0] ?? null;
}

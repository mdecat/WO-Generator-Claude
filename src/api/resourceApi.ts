import { dvGet } from './dataverseClient';
import type { ODataResponse } from '../types/dataverse';

export interface BookableResource {
  bookableresourceid: string;
  name: string;
  resourcetype: number; // 1=Generic,2=Contact,3=User,4=Equipment,5=Account,6=Crew,7=Facility
  '_userid_value'?: string;
  '_userid_value@OData.Community.Display.V1.FormattedValue'?: string;
}

export interface BookableResourceCharacteristic {
  bookableresourcecharacteristicid: string;
  '_resource_value': string;
  '_resource_value@OData.Community.Display.V1.FormattedValue'?: string;
  '_characteristic_value': string;
  '_characteristic_value@OData.Community.Display.V1.FormattedValue'?: string;
}

export interface ResourceTerritory {
  bookableresourceterritoryid: string;
  '_resource_value': string;
  '_territoryid_value': string;
  '_territoryid_value@OData.Community.Display.V1.FormattedValue'?: string;
}

export interface ResourceBooking {
  bookableresourcebookingid: string;
  name: string;
  starttime: string;
  endtime: string;
  '_resource_value': string;
}

export interface ResourceCoverageEntry {
  resource: BookableResource;
  matchedCharacteristics: string[]; // characteristic IDs this resource has
  territories: string[];            // territory display names
  upcomingBookingsCount: number;
  nextAvailableDate?: string;       // ISO string of first day with no bookings (simple heuristic)
}

const RESOURCE_TYPE_LABELS: Record<number, string> = {
  1: 'Generic',
  2: 'Contact',
  3: 'User',
  4: 'Equipment',
  5: 'Account',
  6: 'Crew',
  7: 'Facility',
  8: 'Pool',
};

export function resourceTypeLabel(type: number): string {
  return RESOURCE_TYPE_LABELS[type] ?? 'Unknown';
}

/** Find bookable resources that match ANY of the given characteristic IDs */
export async function getResourcesForCharacteristics(
  characteristicIds: string[],
  orgUrl?: string
): Promise<ResourceCoverageEntry[]> {
  if (characteristicIds.length === 0) return [];

  // Step 1: find all resource-characteristic links for the required characteristics
  const filterParts = characteristicIds.map((id) => `_characteristic_value eq '${id}'`).join(' or ');
  const charLinks = await dvGet<ODataResponse<BookableResourceCharacteristic>>(
    '/bookableresourcecharacteristics',
    {
      $filter: filterParts,
      $select: 'bookableresourcecharacteristicid,_resource_value,_characteristic_value',
    },
    orgUrl
  );

  if (!charLinks.value?.length) return [];

  // Step 2: build map of resourceId → matched characteristic IDs
  const resourceCharMap = new Map<string, string[]>();
  for (const link of charLinks.value) {
    const existing = resourceCharMap.get(link._resource_value) ?? [];
    existing.push(link._characteristic_value);
    resourceCharMap.set(link._resource_value, existing);
  }

  const resourceIds = [...resourceCharMap.keys()];

  // Step 3: fetch resource details in parallel with territories + bookings
  const resourceFilter = resourceIds.map((id) => `bookableresourceid eq '${id}'`).join(' or ');
  const today = new Date().toISOString();

  const [resourcesResp, territoriesResp, bookingsResp] = await Promise.all([
    dvGet<ODataResponse<BookableResource>>(
      '/bookableresources',
      {
        $filter: resourceFilter,
        $select: 'bookableresourceid,name,resourcetype',
        $orderby: 'name asc',
      },
      orgUrl
    ),
    dvGet<ODataResponse<ResourceTerritory>>(
      '/bookableresourceterritories',
      {
        $filter: resourceIds.map((id) => `_resource_value eq '${id}'`).join(' or '),
        $select: 'bookableresourceterritoryid,_resource_value,_territoryid_value',
      },
      orgUrl
    ).catch(() => ({ value: [] as ResourceTerritory[] })),
    dvGet<ODataResponse<ResourceBooking>>(
      '/bookableresourcebookings',
      {
        $filter: `(${resourceIds.map((id) => `_resource_value eq '${id}'`).join(' or ')}) and starttime ge '${today}'`,
        $select: 'bookableresourcebookingid,_resource_value,starttime,endtime',
        $orderby: 'starttime asc',
        $top: '500',
      },
      orgUrl
    ).catch(() => ({ value: [] as ResourceBooking[] })),
  ]);

  // Step 4: build territory map resourceId → territory names
  const territoryMap = new Map<string, string[]>();
  for (const t of territoriesResp.value ?? []) {
    const name = t['_territoryid_value@OData.Community.Display.V1.FormattedValue'] ?? t._territoryid_value;
    const existing = territoryMap.get(t._resource_value) ?? [];
    if (!existing.includes(name)) existing.push(name);
    territoryMap.set(t._resource_value, existing);
  }

  // Step 5: build booking count map resourceId → count
  const bookingMap = new Map<string, number>();
  for (const b of bookingsResp.value ?? []) {
    bookingMap.set(b._resource_value, (bookingMap.get(b._resource_value) ?? 0) + 1);
  }

  // Step 6: assemble results
  return (resourcesResp.value ?? []).map((resource) => ({
    resource,
    matchedCharacteristics: resourceCharMap.get(resource.bookableresourceid) ?? [],
    territories: territoryMap.get(resource.bookableresourceid) ?? [],
    upcomingBookingsCount: bookingMap.get(resource.bookableresourceid) ?? 0,
  }));
}

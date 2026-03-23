import { dvGet } from './dataverseClient';
import type { ODataResponse } from '../types/dataverse';
import type {
  IncidentType,
  IncidentTypeCharacteristic,
  IncidentTypeServiceTask,
  IncidentTypeProduct,
  IncidentTypeDetails,
} from '../types/fieldService';

const BASE = '/msdyn_incidenttypes';

/** Fetch all active incident types */
export async function getIncidentTypes(orgUrl?: string): Promise<IncidentType[]> {
  const resp = await dvGet<ODataResponse<IncidentType>>(
    BASE,
    {
      $select: 'msdyn_incidenttypeid,msdyn_name,msdyn_description,msdyn_estimatedduration,_msdyn_defaultworkordertype_value',
      $orderby: 'msdyn_name asc',
      $top: '500',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Fetch characteristics for a specific incident type */
async function getCharacteristics(
  incidentTypeId: string,
  orgUrl?: string
): Promise<IncidentTypeCharacteristic[]> {
  const resp = await dvGet<ODataResponse<IncidentTypeCharacteristic>>(
    '/msdyn_incidenttypecharacteristics',
    {
      $filter: `_msdyn_incidenttype_value eq '${incidentTypeId}'`,
      $select: 'msdyn_incidenttypecharacteristicid,msdyn_name,_msdyn_characteristic_value,_msdyn_ratingvalue_value',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Fetch service tasks for a specific incident type */
async function getServiceTasks(
  incidentTypeId: string,
  orgUrl?: string
): Promise<IncidentTypeServiceTask[]> {
  const resp = await dvGet<ODataResponse<IncidentTypeServiceTask>>(
    '/msdyn_incidenttypeservicetasks',
    {
      $filter: `_msdyn_incidenttype_value eq '${incidentTypeId}'`,
      $select: 'msdyn_incidenttypeservicetaskid,msdyn_name,msdyn_estimatedduration,_msdyn_tasktype_value',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Fetch products for a specific incident type */
async function getProducts(
  incidentTypeId: string,
  orgUrl?: string
): Promise<IncidentTypeProduct[]> {
  const resp = await dvGet<ODataResponse<IncidentTypeProduct>>(
    '/msdyn_incidenttypeproducts',
    {
      $filter: `_msdyn_incidenttype_value eq '${incidentTypeId}'`,
      $select: 'msdyn_incidenttypeproductid,msdyn_name,msdyn_quantity,_msdyn_product_value,_msdyn_unit_value',
    },
    orgUrl
  );
  return resp.value ?? [];
}

/** Fetch full incident type details with all related records */
export async function getIncidentTypeDetails(
  incidentTypeId: string,
  orgUrl?: string
): Promise<IncidentTypeDetails> {
  const [incidentType, characteristics, serviceTasks, products] = await Promise.all([
    dvGet<IncidentType>(`${BASE}(${incidentTypeId})`, undefined, orgUrl),
    getCharacteristics(incidentTypeId, orgUrl).catch(() => [] as IncidentTypeCharacteristic[]),
    getServiceTasks(incidentTypeId, orgUrl).catch(() => [] as IncidentTypeServiceTask[]),
    getProducts(incidentTypeId, orgUrl).catch(() => [] as IncidentTypeProduct[]),
  ]);

  const totalEstimatedDuration =
    serviceTasks.reduce((sum, t) => sum + (t.msdyn_estimatedduration ?? 0), 0) ||
    (incidentType.msdyn_estimatedduration ?? 0);

  return { incidentType, characteristics, serviceTasks, products, totalEstimatedDuration };
}

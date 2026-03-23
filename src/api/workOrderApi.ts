import { dvPost } from './dataverseClient';
import { getDefaultPriceList } from './fieldServiceApi';
import type { WorkOrder } from '../types/fieldService';
import type { WOCreationResult } from '../types/generator';

const WO_SET = '/msdyn_workorders';

interface CreateWOInput {
  serviceAccountId: string;
  serviceAccountName: string;
  workOrderTypeId: string;
  incidentTypeId: string;
  priorityId?: string;
  priorityName?: string;
  priceListId?: string;
  scheduledDate: Date;      // Used for msdyn_timefrompromised
  timeToDate?: Date;        // If set, used for msdyn_timetopromised date part (whole-range mode)
  timeWindowStart?: number; // Hour 0-23, e.g. 8
  timeWindowEnd?: number;   // Hour 0-23, e.g. 17
  description?: string;
}

function buildDateISO(date: Date, hour: number): string {
  const d = new Date(date);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function buildWOBody(
  input: CreateWOInput,
  priceListId?: string,
  includeIncidentType = true
): Record<string, unknown> {
  const startHour = input.timeWindowStart ?? 8;
  const endHour = input.timeWindowEnd ?? 17;

  const toDate = input.timeToDate ?? input.scheduledDate;

  const body: WorkOrder = {
    'msdyn_serviceaccount@odata.bind': `/accounts(${input.serviceAccountId})`,
    'msdyn_workordertype@odata.bind': `/msdyn_workordertypes(${input.workOrderTypeId})`,
    msdyn_timefrompromised: buildDateISO(input.scheduledDate, startHour),
    msdyn_timetopromised: buildDateISO(toDate, endHour),
    msdyn_systemstatus: 690970000, // Open – Unscheduled
  };

  // msdyn_incidenttype is optional — some orgs don't expose it as a navigation property
  if (includeIncidentType && input.incidentTypeId) {
    body['msdyn_incidenttype@odata.bind'] = `/msdyn_incidenttypes(${input.incidentTypeId})`;
  }

  const pl = priceListId ?? input.priceListId;
  if (pl) body['msdyn_pricelist@odata.bind'] = `/pricelevels(${pl})`;
  if (input.priorityId) body['msdyn_priority@odata.bind'] = `/msdyn_priorities(${input.priorityId})`;
  if (input.description) body.msdyn_description = input.description;

  return body as Record<string, unknown>;
}

/** Create a single Work Order — handles price list auto-fallback on failure. */
export async function createWorkOrder(
  input: CreateWOInput,
  orgUrl?: string
): Promise<WOCreationResult> {
  try {
    const created = await dvPost<WorkOrder>(
      WO_SET,
      buildWOBody(input),
      undefined,
      orgUrl
    );

    return {
      accountId: input.serviceAccountId,
      accountName: input.serviceAccountName,
      workOrderId: created.msdyn_workorderid,
      workOrderName: created.msdyn_name,
      scheduledDate: input.scheduledDate,
      priorityName: input.priorityName,
      status: 'success',
    };
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { data?: { error?: { message?: string; code?: string } }; status?: number };
      message?: string;
    };
    const errMsg =
      axiosErr.response?.data?.error?.message ?? axiosErr.message ?? String(err);
    const errCode =
      axiosErr.response?.data?.error?.code ?? String(axiosErr.response?.status ?? 'UNKNOWN');

    // Price list missing — auto-fetch org default and retry once
    if (
      !input.priceListId &&
      (errMsg.toLowerCase().includes('price') || errMsg.toLowerCase().includes('pricelist'))
    ) {
      const defaultPL = await getDefaultPriceList(orgUrl).catch(() => null);
      if (defaultPL) {
        return createWorkOrder(
          { ...input, priceListId: defaultPL.pricelevelid },
          orgUrl
        );
      }
    }

    // msdyn_incidenttype not declared as nav property in this org — retry without it
    if (
      input.incidentTypeId &&
      errMsg.toLowerCase().includes('undeclared') &&
      errMsg.toLowerCase().includes('msdyn_incidenttype')
    ) {
      try {
        const created = await dvPost<WorkOrder>(
          WO_SET,
          buildWOBody(input, input.priceListId, false),
          undefined,
          orgUrl
        );
        return {
          accountId: input.serviceAccountId,
          accountName: input.serviceAccountName,
          workOrderId: created.msdyn_workorderid,
          workOrderName: created.msdyn_name,
          scheduledDate: input.scheduledDate,
          priorityName: input.priorityName,
          status: 'success',
        };
      } catch {
        // fall through to return failure below
      }
    }

    return {
      accountId: input.serviceAccountId,
      accountName: input.serviceAccountName,
      scheduledDate: input.scheduledDate,
      priorityName: input.priorityName,
      status: 'failed',
      errorMessage: errMsg,
      errorCode: errCode,
    };
  }
}

/** Process WO creation in parallel chunks with live progress callbacks. */
export async function createWorkOrdersBatch(
  inputs: CreateWOInput[],
  orgUrl: string | undefined,
  onProgress: (completed: number, total: number, result: WOCreationResult) => void,
  signal?: AbortSignal,
  chunkSize = 5
): Promise<WOCreationResult[]> {
  const results: WOCreationResult[] = [];
  let completed = 0;

  for (let i = 0; i < inputs.length; i += chunkSize) {
    if (signal?.aborted) break;
    const chunk = inputs.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map((input) => createWorkOrder(input, orgUrl))
    );
    for (const r of chunkResults) {
      results.push(r);
      completed++;
      onProgress(completed, inputs.length, r);
    }
  }

  return results;
}

export type { CreateWOInput };

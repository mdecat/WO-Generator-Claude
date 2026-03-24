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
  incidentTypeField: 'primaryincidenttype' | 'incidenttype' | 'none' = 'primaryincidenttype'
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

  if (input.incidentTypeId && incidentTypeField !== 'none') {
    const navProp = incidentTypeField === 'primaryincidenttype'
      ? 'msdyn_primaryincidenttype@odata.bind'
      : 'msdyn_incidenttype@odata.bind';
    (body as Record<string, unknown>)[navProp] = `/msdyn_incidenttypes(${input.incidentTypeId})`;
  }

  const pl = priceListId ?? input.priceListId;
  if (pl) body['msdyn_pricelist@odata.bind'] = `/pricelevels(${pl})`;
  if (input.priorityId) body['msdyn_priority@odata.bind'] = `/msdyn_priorities(${input.priorityId})`;
  if (input.description) (body as Record<string, unknown>)['msdyn_workordersummary'] = input.description;

  return body as Record<string, unknown>;
}

function makeSuccessResult(input: CreateWOInput, created: WorkOrder): WOCreationResult {
  return {
    accountId: input.serviceAccountId,
    accountName: input.serviceAccountName,
    workOrderId: created.msdyn_workorderid,
    workOrderName: created.msdyn_name,
    scheduledDate: input.scheduledDate,
    priorityName: input.priorityName,
    status: 'success',
  };
}

function extractError(err: unknown): { errMsg: string; errCode: string } {
  const axiosErr = err as {
    response?: { data?: { error?: { message?: string; code?: string } }; status?: number };
    message?: string;
  };
  return {
    errMsg: axiosErr.response?.data?.error?.message ?? axiosErr.message ?? String(err),
    errCode: axiosErr.response?.data?.error?.code ?? String(axiosErr.response?.status ?? 'UNKNOWN'),
  };
}

/**
 * Create a single Work Order — always includes incident type.
 * Tries msdyn_primaryincidenttype first (correct Field Service field name),
 * falls back to msdyn_incidenttype if the first name is rejected.
 * Never creates a WO without incident type — fails if all attempts fail.
 */
export async function createWorkOrder(
  input: CreateWOInput,
  orgUrl?: string
): Promise<WOCreationResult> {
  // Attempt 1: msdyn_primaryincidenttype@odata.bind (correct Field Service field name)
  try {
    const created = await dvPost<WorkOrder>(
      WO_SET,
      buildWOBody(input, undefined, 'primaryincidenttype'),
      undefined,
      orgUrl
    );
    return makeSuccessResult(input, created);
  } catch (err: unknown) {
    const { errMsg, errCode } = extractError(err);

    // Price list missing — auto-fetch org default and retry once
    if (
      !input.priceListId &&
      (errMsg.toLowerCase().includes('price') || errMsg.toLowerCase().includes('pricelist'))
    ) {
      const defaultPL = await getDefaultPriceList(orgUrl).catch(() => null);
      if (defaultPL) {
        return createWorkOrder({ ...input, priceListId: defaultPL.pricelevelid }, orgUrl);
      }
    }

    // "primaryincidenttype" rejected — try legacy field name "msdyn_incidenttype"
    if (
      input.incidentTypeId &&
      errMsg.toLowerCase().includes('undeclared') &&
      errMsg.toLowerCase().includes('primaryincidenttype')
    ) {
      try {
        const created = await dvPost<WorkOrder>(
          WO_SET,
          buildWOBody(input, input.priceListId, 'incidenttype'),
          undefined,
          orgUrl
        );
        return makeSuccessResult(input, created);
      } catch (err2: unknown) {
        const e2 = extractError(err2);
        return {
          accountId: input.serviceAccountId,
          accountName: input.serviceAccountName,
          scheduledDate: input.scheduledDate,
          priorityName: input.priorityName,
          status: 'failed',
          errorMessage: e2.errMsg,
          errorCode: e2.errCode,
        };
      }
    }

    // Any other error — return failure

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

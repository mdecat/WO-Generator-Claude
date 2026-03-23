import { useCallback, useRef } from 'react';
import { useGeneratorStore } from '../store/generatorStore';
import { buildDistributionPlan } from '../utils/workOrderBuilder';
import { createWorkOrdersBatch, type CreateWOInput } from '../api/workOrderApi';

interface UseWorkOrderGenerationOptions {
  priorities: import('../types/fieldService').Priority[];
}

export function useWorkOrderGeneration({ priorities }: UseWorkOrderGenerationOptions) {
  const store = useGeneratorStore();
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    const { selectedAccounts, selectedIncidentType, woParams, orgUrl } = store;

    if (!selectedIncidentType || !woParams || selectedAccounts.length === 0) {
      throw new Error('Missing required generation parameters');
    }

    // Build distribution plan
    const plan = buildDistributionPlan(selectedAccounts, woParams, priorities);
    store.startSession(plan.length);

    abortRef.current = new AbortController();

    // Map plan → API inputs
    const inputs: CreateWOInput[] = plan.map((item) => ({
      serviceAccountId: item.account.accountid,
      serviceAccountName: item.account.name,
      workOrderTypeId: woParams.workOrderTypeId,
      incidentTypeId: selectedIncidentType.msdyn_incidenttypeid,
      priorityId: item.priority?.msdyn_priorityid,
      priorityName: item.priority?.msdyn_name,
      priceListId: (item.account as { _defaultpricelevelid_value?: string })._defaultpricelevelid_value,
      scheduledDate: woParams.useWholeRange ? woParams.fromDate : item.scheduledDate,
      timeToDate: woParams.useWholeRange ? woParams.toDate : undefined,
      timeWindowStart: woParams.timeWindowStart,
      timeWindowEnd: woParams.timeWindowEnd,
      description: woParams.description,
    }));

    try {
      await createWorkOrdersBatch(
        inputs,
        orgUrl,
        (_completed, _total, result) => {
          store.recordResult(result);
        },
        abortRef.current.signal,
        5 // chunk size
      );
    } finally {
      store.completeSession();
    }
  }, [store, priorities]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    store.completeSession();
  }, [store]);

  return { generate, cancel };
}

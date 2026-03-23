import { create } from 'zustand';
import type { IncidentType, IncidentTypeDetails, ServiceAccount, WorkOrderType, Priority } from '../types/fieldService';
import type {
  FilterCondition,
  WOGenerationParams,
  GenerationSession,
  WizardStep,
  WOCreationResult,
} from '../types/generator';
import type { DataverseEnvironment } from '../types/dataverse';
import { DEFAULT_ORG_URL } from '../authConfig';
import { v4 as uuidv4 } from 'uuid';

interface GeneratorState {
  // ─── Environment ───────────────────────────────────────────
  orgUrl: string;
  environments: DataverseEnvironment[];
  environmentsLoaded: boolean;
  setOrgUrl: (url: string) => void;
  setEnvironments: (envs: DataverseEnvironment[]) => void;

  // ─── Current Wizard Step ───────────────────────────────────
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // ─── Step 1: Incident Type ─────────────────────────────────
  selectedIncidentType: IncidentType | null;
  incidentTypeDetails: IncidentTypeDetails | null;
  setIncidentType: (it: IncidentType | null) => void;
  setIncidentTypeDetails: (details: IncidentTypeDetails | null) => void;

  // ─── Step 2: Accounts ──────────────────────────────────────
  queryFilters: FilterCondition[];
  queriedAccounts: ServiceAccount[];
  selectedAccounts: ServiceAccount[];
  accountSelectionMode: 'query' | 'map';
  setQueryFilters: (filters: FilterCondition[]) => void;
  setQueriedAccounts: (accounts: ServiceAccount[]) => void;
  setSelectedAccounts: (accounts: ServiceAccount[]) => void;
  toggleAccountSelected: (account: ServiceAccount) => void;
  setAccountSelectionMode: (mode: 'query' | 'map') => void;
  clearAccountSelection: () => void;

  // ─── Step 3: WO Parameters ─────────────────────────────────
  woParams: WOGenerationParams | null;
  setWOParams: (params: WOGenerationParams) => void;

  // ─── Step 5: Generation Results ────────────────────────────
  session: GenerationSession | null;
  startSession: (totalRequested: number) => void;
  recordResult: (result: WOCreationResult) => void;
  completeSession: () => void;
  resetSession: () => void;
  resetAll: () => void;
}

const STEP_ORDER: WizardStep[] = [
  'environment',
  'incident-type',
  'accounts',
  'parameters',
  'preview',
  'results',
];

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  // ─── Environment ───────────────────────────────────────────
  orgUrl: DEFAULT_ORG_URL,
  environments: [],
  environmentsLoaded: false,
  setOrgUrl: (url) => set({ orgUrl: url }),
  setEnvironments: (envs) => set({ environments: envs, environmentsLoaded: true }),

  // ─── Current Wizard Step ───────────────────────────────────
  currentStep: 'environment',
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx < STEP_ORDER.length - 1) set({ currentStep: STEP_ORDER[idx + 1] });
  },
  prevStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx > 0) set({ currentStep: STEP_ORDER[idx - 1] });
  },

  // ─── Step 1: Incident Type ─────────────────────────────────
  selectedIncidentType: null,
  incidentTypeDetails: null,
  setIncidentType: (it) => set({ selectedIncidentType: it, incidentTypeDetails: null }),
  setIncidentTypeDetails: (details) => set({ incidentTypeDetails: details }),

  // ─── Step 2: Accounts ──────────────────────────────────────
  queryFilters: [],
  queriedAccounts: [],
  selectedAccounts: [],
  accountSelectionMode: 'query',
  setQueryFilters: (filters) => set({ queryFilters: filters }),
  setQueriedAccounts: (accounts) => set({ queriedAccounts: accounts }),
  setSelectedAccounts: (accounts) => set({ selectedAccounts: accounts }),
  toggleAccountSelected: (account) => {
    const curr = get().selectedAccounts;
    const exists = curr.some((a) => a.accountid === account.accountid);
    set({
      selectedAccounts: exists
        ? curr.filter((a) => a.accountid !== account.accountid)
        : [...curr, account],
    });
  },
  setAccountSelectionMode: (mode) => set({ accountSelectionMode: mode }),
  clearAccountSelection: () => set({ selectedAccounts: [] }),

  // ─── Step 3: WO Parameters ─────────────────────────────────
  woParams: null,
  setWOParams: (params) => set({ woParams: params }),

  // ─── Step 5: Generation Results ────────────────────────────
  session: null,
  startSession: (totalRequested) =>
    set({
      session: {
        id: uuidv4(),
        startTime: new Date(),
        totalRequested,
        totalSuccess: 0,
        totalFailed: 0,
        results: [],
        status: 'running',
      },
    }),
  recordResult: (result) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          totalSuccess:
            state.session.totalSuccess + (result.status === 'success' ? 1 : 0),
          totalFailed:
            state.session.totalFailed + (result.status === 'failed' ? 1 : 0),
          results: [...state.session.results, result],
        },
      };
    }),
  completeSession: () =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: { ...state.session, endTime: new Date(), status: 'complete' },
      };
    }),
  resetSession: () => set({ session: null }),
  resetAll: () =>
    set({
      currentStep: 'incident-type',
      selectedIncidentType: null,
      incidentTypeDetails: null,
      queryFilters: [],
      queriedAccounts: [],
      selectedAccounts: [],
      woParams: null,
      session: null,
    }),
}));

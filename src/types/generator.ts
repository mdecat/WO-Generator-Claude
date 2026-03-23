import type { ServiceAccount, Priority } from './fieldService';

/** Query builder filter condition */
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'startswith'
  | 'endswith'
  | 'gt'
  | 'lt';

/** Available account filter fields */
export interface AccountFilterField {
  key: string;
  label: string;
  type: 'string' | 'number';
  operators: FilterOperator[];
}

/** Work Order generation parameters */
export interface WOGenerationParams {
  workOrderTypeId: string;
  workOrderTypeName: string;
  priorityMode: 'fixed' | 'random';
  priorityId?: string;        // When mode = 'fixed'
  priorityName?: string;
  fromDate: Date;
  toDate: Date;
  targetCount: number;        // How many WOs to create
  distributionMode: 'random' | 'even';
  timeWindowStart: number;    // Hour (0-23), e.g., 8 for 8 AM
  timeWindowEnd: number;      // Hour (0-23), e.g., 17 for 5 PM
  useWholeRange: boolean;     // true = all WOs share fromDate→toDate window; false = each WO gets its own day
  description?: string;
}

/** Result for a single Work Order creation attempt */
export interface WOCreationResult {
  accountId: string;
  accountName: string;
  workOrderId?: string;
  workOrderName?: string;
  scheduledDate?: Date;
  priorityName?: string;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  errorCode?: string;
}

/** Overall generation session results */
export interface GenerationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  totalRequested: number;
  totalSuccess: number;
  totalFailed: number;
  results: WOCreationResult[];
  status: 'idle' | 'running' | 'complete' | 'error';
}

/** Step definitions for the wizard */
export type WizardStep =
  | 'environment'
  | 'incident-type'
  | 'accounts'
  | 'parameters'
  | 'preview'
  | 'results';

export const WIZARD_STEPS: { key: WizardStep; label: string; description: string }[] = [
  { key: 'environment', label: 'Environment', description: 'Select target Dataverse environment' },
  { key: 'incident-type', label: 'Incident Type', description: 'Choose Work Order template' },
  { key: 'accounts', label: 'Service Accounts', description: 'Target accounts via query or map' },
  { key: 'parameters', label: 'WO Parameters', description: 'Configure generation options' },
  { key: 'preview', label: 'Preview', description: 'Review and confirm generation plan' },
  { key: 'results', label: 'Results', description: 'Generation summary and error log' },
];

/** Paginated account query result */
export interface AccountQueryResult {
  accounts: ServiceAccount[];
  totalCount: number;
  hasMore: boolean;
  nextLink?: string;
}

/** Map bounds */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Distribution plan — maps each WO to an account + date */
export interface WODistributionPlan {
  account: ServiceAccount;
  scheduledDate: Date;
  priority: Priority | null;
  index: number;
}

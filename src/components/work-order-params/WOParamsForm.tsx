import { useState, useEffect } from 'react';
import {
  Field,
  Select,
  Input,
  Text,
  Button,
  makeStyles,
  tokens,
  Spinner,
  RadioGroup,
  Radio,
  Slider,
  Badge,
  Divider,
  Card,
  Switch,
  InfoLabel,
} from '@fluentui/react-components';
import {
  WrenchRegular,
  CalendarRegular,
  ArrowShuffleRegular,
  NumberSymbolRegular,
  ClockRegular,
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { getWorkOrderTypes, getPriorities } from '../../api/fieldServiceApi';
import { useGeneratorStore } from '../../store/generatorStore';
import type { WOGenerationParams } from '../../types/generator';
import { format } from 'date-fns';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalXS,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: tokens.spacingVerticalM,
    alignItems: 'start',
  },
  dateRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
  priorityCard: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  randomizeBadge: {
    backgroundColor: '#8764B8',
    color: 'white',
  },
  countSlider: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  countInput: {
    width: '80px',
  },
  timeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
});

interface WOParamsFormProps {
  orgUrl?: string;
  onChange?: (params: WOGenerationParams | null) => void;
}

export function WOParamsForm({ orgUrl, onChange }: WOParamsFormProps) {
  const styles = useStyles();
  const store = useGeneratorStore();
  const existing = store.woParams;

  const [workOrderTypeId, setWorkOrderTypeId] = useState(existing?.workOrderTypeId ?? '');
  const [priorityMode, setPriorityMode] = useState<'fixed' | 'random'>(existing?.priorityMode ?? 'random');
  const [priorityId, setPriorityId] = useState(existing?.priorityId ?? '');
  const [fromDate, setFromDate] = useState(
    existing?.fromDate ? format(existing.fromDate, 'yyyy-MM-dd') : ''
  );
  const [toDate, setToDate] = useState(
    existing?.toDate ? format(existing.toDate, 'yyyy-MM-dd') : ''
  );
  const [targetCount, setTargetCount] = useState(existing?.targetCount ?? 10);
  const [distributionMode, setDistributionMode] = useState<'random' | 'even'>(
    existing?.distributionMode ?? 'random'
  );
  const [timeWindowStart, setTimeWindowStart] = useState(existing?.timeWindowStart ?? 8);
  const [timeWindowEnd, setTimeWindowEnd] = useState(existing?.timeWindowEnd ?? 17);
  const [useWholeRange, setUseWholeRange] = useState(existing?.useWholeRange ?? false);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: workOrderTypes = [], isLoading: loadingWOT } = useQuery({
    queryKey: ['workOrderTypes', orgUrl],
    queryFn: () => getWorkOrderTypes(orgUrl),
    staleTime: 5 * 60 * 1000,
  });

  const { data: priorities = [], isLoading: loadingPri } = useQuery({
    queryKey: ['priorities', orgUrl],
    queryFn: () => getPriorities(orgUrl),
    staleTime: 5 * 60 * 1000,
  });

  // Pre-select WO type from incident type's default, falling back to first in list
  const defaultWOTypeId = store.selectedIncidentType?.['_msdyn_defaultworkordertype_value'] ?? '';
  useEffect(() => {
    if (workOrderTypes.length > 0 && !workOrderTypeId) {
      const defaultMatch = defaultWOTypeId
        ? workOrderTypes.find((t) => t.msdyn_workordertypeid === defaultWOTypeId)
        : null;
      setWorkOrderTypeId(defaultMatch?.msdyn_workordertypeid ?? workOrderTypes[0].msdyn_workordertypeid);
    }
  }, [workOrderTypes, workOrderTypeId, defaultWOTypeId]);

  // Build and propagate params whenever any field changes
  useEffect(() => {
    const errors: Record<string, string> = {};
    if (!workOrderTypeId) errors.workOrderTypeId = 'Required';
    if (!fromDate) errors.fromDate = 'Required';
    if (!toDate) errors.toDate = 'Required';
    if (fromDate && toDate && fromDate > toDate)
      errors.toDate = 'Must be after From Date';
    if (targetCount < 1) errors.targetCount = 'Must be at least 1';
    if (targetCount > 1000) errors.targetCount = 'Maximum 1000 work orders per run';
    if (priorityMode === 'fixed' && !priorityId) errors.priorityId = 'Required when mode is Fixed';
    if (timeWindowEnd <= timeWindowStart) errors.timeWindowEnd = 'Must be after start time';

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      const woType = workOrderTypes.find((t) => t.msdyn_workordertypeid === workOrderTypeId);
      const priority = priorities.find((p) => p.msdyn_priorityid === priorityId);
      const params: WOGenerationParams = {
        workOrderTypeId,
        workOrderTypeName: woType?.msdyn_name ?? '',
        priorityMode,
        priorityId: priorityMode === 'fixed' ? priorityId : undefined,
        priorityName: priorityMode === 'fixed' ? priority?.msdyn_name : undefined,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        targetCount,
        distributionMode,
        timeWindowStart,
        timeWindowEnd,
        useWholeRange,
        description: description.trim() || undefined,
      };
      store.setWOParams(params);
      onChange?.(params);
    } else {
      onChange?.(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderTypeId, priorityMode, priorityId, fromDate, toDate, targetCount, distributionMode, timeWindowStart, timeWindowEnd, useWholeRange, description]);

  const maxCount = Math.max(store.selectedAccounts.length * 10, 100);

  return (
    <div className={styles.root}>
      {/* Work Order Type */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <WrenchRegular />
          <Text weight="semibold">Work Order Configuration</Text>
        </div>
        <div className={styles.formGrid}>
          <Field
            label="Work Order Type"
            required
            hint={defaultWOTypeId && workOrderTypeId === defaultWOTypeId ? 'Pre-filled from Incident Type default' : undefined}
            validationMessage={validationErrors.workOrderTypeId}
            validationState={validationErrors.workOrderTypeId ? 'error' : 'none'}
          >
            {loadingWOT ? (
              <Spinner size="tiny" label="Loading..." />
            ) : (
              <Select
                value={workOrderTypeId}
                onChange={(_, d) => setWorkOrderTypeId(d.value)}
              >
                <option value="">Select Work Order Type...</option>
                {workOrderTypes.map((wot) => (
                  <option key={wot.msdyn_workordertypeid} value={wot.msdyn_workordertypeid}>
                    {wot.msdyn_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Description (optional)" hint="Applied to all generated Work Orders">
            <Input
              value={description}
              onChange={(_, d) => setDescription(d.value)}
              placeholder="Auto-generated demo data — [Incident Type]"
            />
          </Field>
        </div>
      </div>

      <Divider />

      {/* Priority */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <ArrowShuffleRegular />
          <Text weight="semibold">Priority</Text>
        </div>
        <div className={styles.priorityCard}>
          <RadioGroup
            value={priorityMode}
            onChange={(_, d) => setPriorityMode(d.value as 'fixed' | 'random')}
            layout="horizontal"
          >
            <Radio value="fixed" label="Fixed Priority" />
            <Radio value="random" label={
              <span>
                Random Priority{' '}
                <Badge className={styles.randomizeBadge} size="small">DEMO</Badge>
              </span>
            } />
          </RadioGroup>

          {priorityMode === 'fixed' && (
            <Field
              label="Priority"
              required
              validationMessage={validationErrors.priorityId}
              validationState={validationErrors.priorityId ? 'error' : 'none'}
              hint={!loadingPri && priorities.length === 0
                ? 'No priorities found. Go to Field Service → Settings → Priorities to create some.'
                : undefined}
            >
              {loadingPri ? (
                <Spinner size="tiny" label="Loading..." />
              ) : (
                <Select value={priorityId} onChange={(_, d) => setPriorityId(d.value)}>
                  <option value="">Select Priority...</option>
                  {priorities.map((p) => (
                    <option key={p.msdyn_priorityid} value={p.msdyn_priorityid}>
                      {p.msdyn_name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {priorityMode === 'random' && priorities.length > 0 && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Will randomly assign from: {priorities.map((p) => p.msdyn_name).join(', ')}
            </Text>
          )}
          {priorityMode === 'random' && !loadingPri && priorities.length === 0 && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              No priorities found in this org. Go to Field Service → Settings → Priorities to create some. WOs will be created without a priority until priorities exist.
            </Text>
          )}
        </div>
      </div>

      <Divider />

      {/* Date Range */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <CalendarRegular />
          <Text weight="semibold">Date Range</Text>
          <Badge appearance="tint" color="danger" size="small">Required</Badge>
        </div>
        <div className={styles.dateRow}>
          <Field
            label="From Date"
            required
            validationMessage={validationErrors.fromDate}
            validationState={validationErrors.fromDate ? 'error' : 'none'}
          >
            <Input
              type="date"
              value={fromDate}
              onChange={(_, d) => setFromDate(d.value)}
            />
          </Field>
          <Field
            label="To Date"
            required
            validationMessage={validationErrors.toDate}
            validationState={validationErrors.toDate ? 'error' : 'none'}
          >
            <Input
              type="date"
              value={toDate}
              onChange={(_, d) => setToDate(d.value)}
              min={fromDate}
            />
          </Field>
        </div>

        {/* Time Window */}
        <div className={styles.timeRow}>
          <Field
            label="Service Window Start (hour)"
            hint="e.g. 8 = 8:00 AM"
          >
            <Input
              type="number"
              value={String(timeWindowStart)}
              onChange={(_, d) => setTimeWindowStart(Math.max(0, Math.min(23, Number(d.value))))}
              min="0"
              max="22"
              style={{ width: '100px' }}
              contentAfter={<ClockRegular />}
            />
          </Field>
          <Field
            label="Service Window End (hour)"
            hint="e.g. 17 = 5:00 PM"
            validationMessage={validationErrors.timeWindowEnd}
            validationState={validationErrors.timeWindowEnd ? 'error' : 'none'}
          >
            <Input
              type="number"
              value={String(timeWindowEnd)}
              onChange={(_, d) => setTimeWindowEnd(Math.max(1, Math.min(24, Number(d.value))))}
              min="1"
              max="24"
              style={{ width: '100px' }}
              contentAfter={<ClockRegular />}
            />
          </Field>
        </div>

        {/* Use Whole Range */}
        <Field
          label={
            <InfoLabel
              info={
                useWholeRange
                  ? `Each WO will have Time From Promised = ${fromDate || 'From Date'} ${timeWindowStart}:00 and Time To Promised = ${toDate || 'To Date'} ${timeWindowEnd}:00 — the entire range as a single scheduling window.`
                  : 'Each WO gets its own specific day within the date range. Time From/To Promised span that single day.'
              }
            >
              Use Whole Range
            </InfoLabel>
          }
        >
          <Switch
            checked={useWholeRange}
            onChange={(_, d) => setUseWholeRange(d.checked)}
            label={useWholeRange
              ? `Yes — all WOs span ${fromDate || '…'} ${timeWindowStart}:00 → ${toDate || '…'} ${timeWindowEnd}:00`
              : 'No — each WO is assigned its own day in the range'}
          />
        </Field>
      </div>

      <Divider />

      {/* Count & Distribution */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <NumberSymbolRegular />
          <Text weight="semibold">Volume & Distribution</Text>
        </div>

        <div className={styles.formGrid}>
          {/* Target Count */}
          <div className={styles.countSlider}>
            <Field
              label={
                <InfoLabel
                  info="Total number of Work Orders to generate. If fewer accounts than WOs, accounts are reused in round-robin order."
                >
                  Target Work Order Count
                </InfoLabel>
              }
              required
              validationMessage={validationErrors.targetCount}
              validationState={validationErrors.targetCount ? 'error' : 'none'}
            >
              <div className={styles.sliderRow}>
                <Slider
                  min={1}
                  max={Math.min(maxCount, 500)}
                  value={targetCount}
                  onChange={(_, d) => setTargetCount(d.value)}
                  style={{ flex: 1 }}
                />
                <Input
                  className={styles.countInput}
                  type="number"
                  value={String(targetCount)}
                  onChange={(_, d) => setTargetCount(Math.max(1, Math.min(1000, Number(d.value))))}
                  min="1"
                  max="1000"
                />
              </div>
            </Field>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {store.selectedAccounts.length} accounts selected ·{' '}
              {targetCount > store.selectedAccounts.length
                ? `~${(targetCount / store.selectedAccounts.length).toFixed(1)} WOs per account`
                : `${store.selectedAccounts.length - targetCount} accounts will be skipped`}
            </Text>
          </div>

          {/* Distribution mode */}
          <Field
            label={
              <InfoLabel info="How Work Orders are distributed across the date range.">
                Date Distribution
              </InfoLabel>
            }
          >
            <RadioGroup
              value={distributionMode}
              onChange={(_, d) => setDistributionMode(d.value as 'random' | 'even')}
            >
              <Radio value="random" label="Random distribution across date range" />
              <Radio value="even" label="Even spread across date range" />
            </RadioGroup>
          </Field>
        </div>
      </div>
    </div>
  );
}

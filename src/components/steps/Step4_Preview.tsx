import { useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
  Divider,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import {
  PlayCircleRegular,
  ArrowLeftRegular,
  CheckmarkCircleRegular,
  WarningRegular,
  CalendarRegular,
  PeopleRegular,
  ArrowShuffleRegular,
  NumberSymbolRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { useQuery } from '@tanstack/react-query';
import { getPriorities } from '../../api/fieldServiceApi';
import { buildDistributionPlan, formatDate, summarizePlan } from '../../utils/workOrderBuilder';
import type { WODistributionPlan } from '../../types/generator';
import { useWorkOrderGeneration } from '../../hooks/useWorkOrderGeneration';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalL,
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  statCard: {
    padding: tokens.spacingVerticalM,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  previewTable: {
    maxHeight: '360px',
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#D13438',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  priorityChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },
});

export function Step4Preview() {
  const styles = useStyles();
  const store = useGeneratorStore();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const { data: priorities = [] } = useQuery({
    queryKey: ['priorities', store.orgUrl],
    queryFn: () => getPriorities(store.orgUrl),
    staleTime: 5 * 60 * 1000,
  });

  const { generate } = useWorkOrderGeneration({ priorities });

  // Build a sample distribution plan for preview (only first 50 for preview table)
  const previewPlan = useMemo<WODistributionPlan[]>(() => {
    if (!store.woParams || store.selectedAccounts.length === 0) return [];
    return buildDistributionPlan(store.selectedAccounts, store.woParams, priorities);
  }, [store.selectedAccounts, store.woParams, priorities]);

  const summary = useMemo(() => summarizePlan(previewPlan), [previewPlan]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await generate();
      store.nextStep();
    } catch (err) {
      setGenError((err as Error).message);
      setGenerating(false);
    }
  };

  const { woParams, selectedIncidentType, selectedAccounts } = store;
  if (!woParams || !selectedIncidentType) return null;

  const previewRows = previewPlan.slice(0, 50);

  return (
    <div className={styles.root}>
      <Card style={{ padding: tokens.spacingVerticalL }}>
        <CardHeader
          image={<div className={styles.headerIcon}><PlayCircleRegular /></div>}
          header={<Text weight="semibold" size={400}>Generation Preview</Text>}
          description={
            <Text size={200}>
              Review the plan below. Click <strong>Generate Work Orders</strong> to execute.
            </Text>
          }
        />

        <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

        {/* Summary Stats */}
        <div className={styles.statsRow}>
          <StatCard
            icon={<NumberSymbolRegular />}
            color="#D13438"
            label="Work Orders"
            value={woParams.targetCount}
          />
          <StatCard
            icon={<PeopleRegular />}
            color="#107C10"
            label="Unique Accounts"
            value={summary.uniqueAccounts}
          />
          <StatCard
            icon={<CalendarRegular />}
            color="#0078D4"
            label="Date Range"
            value={
              summary.dateRange
                ? `${formatDate(summary.dateRange.min)} – ${formatDate(summary.dateRange.max)}`
                : '—'
            }
          />
          <StatCard
            icon={<ArrowShuffleRegular />}
            color="#8764B8"
            label="Priority Mode"
            value={woParams.priorityMode === 'random' ? 'Randomized' : woParams.priorityName ?? 'Fixed'}
          />
        </div>

        {/* Priority distribution (when random) */}
        {woParams.priorityMode === 'random' && Object.keys(summary.priorityCounts).length > 0 && (
          <div style={{ marginTop: tokens.spacingVerticalM }}>
            <Text size={200} weight="semibold" style={{ marginBottom: '8px', display: 'block' }}>
              Priority Distribution Preview:
            </Text>
            <div className={styles.priorityChips}>
              {Object.entries(summary.priorityCounts).map(([name, count]) => (
                <Badge key={name} appearance="tint" color="informative">
                  {name}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

        {/* Config Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: tokens.spacingVerticalM }}>
          <ConfigRow label="Incident Type" value={selectedIncidentType.msdyn_name} />
          <ConfigRow label="Work Order Type" value={woParams.workOrderTypeName} />
          <ConfigRow label="Accounts Selected" value={`${selectedAccounts.length} accounts`} />
          <ConfigRow label="Distribution" value={woParams.distributionMode === 'random' ? 'Random' : 'Even spread'} />
          <ConfigRow
            label="Service Window"
            value={woParams.useWholeRange
              ? `Whole range: ${woParams.timeWindowStart}:00 → ${woParams.timeWindowEnd}:00`
              : `${woParams.timeWindowStart}:00 – ${woParams.timeWindowEnd}:00 per day`}
          />
          {woParams.description && (
            <ConfigRow label="Description" value={woParams.description} />
          )}
        </div>

        {/* Preview Table */}
        <Text weight="semibold" size={300} style={{ marginBottom: '8px', display: 'block' }}>
          Sample Distribution (first {Math.min(50, previewPlan.length)} of {previewPlan.length})
        </Text>
        <div className={styles.previewTable}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell>City</TableHeaderCell>
                <TableHeaderCell>Scheduled Date</TableHeaderCell>
                <TableHeaderCell>Priority</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell><Text size={100}>{idx + 1}</Text></TableCell>
                  <TableCell>{row.account.name}</TableCell>
                  <TableCell>{row.account.address1_city ?? '—'}</TableCell>
                  <TableCell>{formatDate(row.scheduledDate)}</TableCell>
                  <TableCell>
                    {row.priority ? (
                      <Badge appearance="tint" color="informative">{row.priority.msdyn_name}</Badge>
                    ) : (
                      <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>None</Text>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {previewPlan.length > 50 && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginTop: '8px', display: 'block' }}>
            + {previewPlan.length - 50} more Work Orders not shown in preview.
          </Text>
        )}
      </Card>

      {/* Warning for large batches */}
      {woParams.targetCount > 100 && (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Large batch</MessageBarTitle>
            Generating {woParams.targetCount} Work Orders may take a few minutes. Do not close this page during generation.
          </MessageBarBody>
        </MessageBar>
      )}

      {genError && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Generation Error</MessageBarTitle>
            {genError}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={store.prevStep}
          disabled={generating}
        >
          Back
        </Button>
        <Button
          appearance="primary"
          icon={generating ? undefined : <PlayCircleRegular />}
          onClick={handleGenerate}
          disabled={generating}
          size="large"
          style={{ backgroundColor: generating ? undefined : '#D13438', minWidth: '220px' }}
        >
          {generating
            ? `Generating ${store.session?.results.length ?? 0} / ${woParams.targetCount}...`
            : `Generate ${woParams.targetCount} Work Orders`}
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string | number;
}) {
  const styles = useStyles();
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ backgroundColor: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>{label}</Text>
        <Text weight="semibold" size={400} style={{ color }}>{value}</Text>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3, minWidth: '140px', flexShrink: 0 }}>
        {label}:
      </Text>
      <Text size={300} weight="semibold">{value}</Text>
    </div>
  );
}

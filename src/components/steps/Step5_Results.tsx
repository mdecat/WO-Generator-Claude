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
  ProgressBar,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  TabList,
  Tab,
  SearchBox,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  ArrowResetRegular,
  ArrowDownloadRegular,
  OpenRegular,
  FilterRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { formatDate } from '../../utils/workOrderBuilder';
import type { WOCreationResult } from '../../types/generator';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalL,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
  },
  tableCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
  },
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '400px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalM} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  errorCell: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorPaletteRedForeground1,
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalS,
    flexWrap: 'wrap',
  },
});

type ResultFilter = 'all' | 'success' | 'failed';

export function Step5Results() {
  const styles = useStyles();
  const store = useGeneratorStore();
  const session = store.session;
  const orgUrl = store.orgUrl;

  const [filter, setFilter] = useState<ResultFilter>('all');
  const [search, setSearch] = useState('');
  const [errorDetail, setErrorDetail] = useState<WOCreationResult | null>(null);

  const results = session?.results ?? [];

  const isRunning = session?.status === 'running';
  const progress = session
    ? (session.results.length / session.totalRequested) * 100
    : 0;

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search && !r.accountName.toLowerCase().includes(search.toLowerCase()) &&
          !r.workOrderName?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [results, filter, search]);

  const successRate = results.length > 0
    ? Math.round((results.filter((r) => r.status === 'success').length / results.length) * 100)
    : 0;

  const handleExport = () => {
    const headers = ['Account', 'WO Number', 'Date', 'Priority', 'Status', 'Error'];
    const rows = results.map((r) => [
      r.accountName,
      r.workOrderName ?? '',
      r.scheduledDate ? formatDate(r.scheduledDate) : '',
      r.priorityName ?? '',
      r.status,
      r.errorMessage ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wo-generation-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <Card style={{ padding: tokens.spacingVerticalL }}>
        <CardHeader
          image={
            <div
              className={styles.headerIcon}
              style={{ backgroundColor: session?.totalFailed === 0 ? '#107C10' : '#D13438' }}
            >
              {session?.totalFailed === 0 ? <CheckmarkCircleRegular /> : <ErrorCircleRegular />}
            </div>
          }
          header={
            <Text weight="semibold" size={400}>
              {isRunning ? 'Generating Work Orders...' : 'Generation Complete'}
            </Text>
          }
          description={
            isRunning ? (
              <Text size={200}>
                {session?.results.length} of {session?.totalRequested} processed...
              </Text>
            ) : (
              <Text size={200}>
                {session?.totalSuccess} succeeded · {session?.totalFailed} failed ·{' '}
                {successRate}% success rate
              </Text>
            )
          }
        />

        {/* Progress bar (running) */}
        {isRunning && (
          <div style={{ marginTop: tokens.spacingVerticalM }}>
            <ProgressBar value={progress / 100} max={1} thickness="large" />
            <Text size={200} style={{ marginTop: '4px', color: tokens.colorNeutralForeground3 }}>
              {Math.round(progress)}% complete
            </Text>
          </div>
        )}

        {/* Summary messages */}
        {!isRunning && session && (
          <div style={{ marginTop: tokens.spacingVerticalM, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {session.totalSuccess > 0 && (
              <MessageBar intent="success">
                <MessageBarBody>
                  <MessageBarTitle>Success</MessageBarTitle>
                  {session.totalSuccess} Work Order{session.totalSuccess !== 1 ? 's' : ''} created successfully in {orgUrl.split('.')[0].replace('https://', '')}.
                </MessageBarBody>
              </MessageBar>
            )}
            {session.totalFailed > 0 && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>{session.totalFailed} Creation Failure{session.totalFailed !== 1 ? 's' : ''}</MessageBarTitle>
                  Review the error details in the table below. Common causes: missing Price List, missing Service Territory, or insufficient permissions.
                </MessageBarBody>
              </MessageBar>
            )}
          </div>
        )}
      </Card>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <StatItem label="Total Requested" value={session?.totalRequested ?? 0} color={tokens.colorNeutralForeground1} />
        <StatItem label="Succeeded" value={session?.totalSuccess ?? 0} color="#107C10" />
        <StatItem label="Failed" value={session?.totalFailed ?? 0} color="#D13438" />
        <StatItem label="Success Rate" value={`${successRate}%`} color="#0078D4" />
      </div>

      {/* Results Table */}
      <Card className={styles.tableCard}>
        <Text weight="semibold" size={400} style={{ marginBottom: tokens.spacingVerticalM }}>
          Detailed Results
        </Text>

        <div className={styles.toolbarRow}>
          <TabList
            selectedValue={filter}
            onTabSelect={(_, d) => setFilter(d.value as ResultFilter)}
            size="small"
          >
            <Tab value="all" icon={<FilterRegular />}>
              All ({results.length})
            </Tab>
            <Tab value="success" icon={<CheckmarkCircleRegular />}>
              Success ({results.filter((r) => r.status === 'success').length})
            </Tab>
            <Tab value="failed" icon={<ErrorCircleRegular />}>
              Failed ({results.filter((r) => r.status === 'failed').length})
            </Tab>
          </TabList>

          <SearchBox
            placeholder="Search account or WO..."
            value={search}
            onChange={(_, d) => setSearch(d.value)}
            size="small"
            style={{ maxWidth: '240px' }}
          />

          <Button
            appearance="outline"
            icon={<ArrowDownloadRegular />}
            onClick={handleExport}
            disabled={results.length === 0}
            size="small"
          >
            Export CSV
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: '36px' }}></TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell>Work Order</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Priority</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Error</TableHeaderCell>
                <TableHeaderCell style={{ width: '48px' }}></TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result, idx) => (
                <ResultRow key={idx} result={result} orgUrl={orgUrl} onShowError={setErrorDetail} />
              ))}
              {filteredResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Text
                      size={200}
                      style={{ color: tokens.colorNeutralForeground3, display: 'block', textAlign: 'center', padding: '24px' }}
                    >
                      {isRunning ? 'Waiting for results...' : 'No results to show.'}
                    </Text>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!errorDetail} onOpenChange={(_, d) => { if (!d.open) setErrorDetail(null); }}>
        <DialogSurface style={{ maxWidth: '600px' }}>
          <DialogTitle>Error Details</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                <div>
                  <Text weight="semibold" size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>Account</Text>
                  <Text>{errorDetail?.accountName}</Text>
                </div>
                {errorDetail?.errorCode && (
                  <div>
                    <Text weight="semibold" size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>Error Code</Text>
                    <Text style={{ fontFamily: 'monospace' }}>{errorDetail.errorCode}</Text>
                  </div>
                )}
                <div>
                  <Text weight="semibold" size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>Error Message</Text>
                  <div style={{
                    backgroundColor: tokens.colorNeutralBackground2,
                    border: `1px solid ${tokens.colorNeutralStroke2}`,
                    borderRadius: tokens.borderRadiusMedium,
                    padding: tokens.spacingVerticalM,
                    fontFamily: 'monospace',
                    fontSize: tokens.fontSizeBase200,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {errorDetail?.errorMessage ?? '(no message)'}
                  </div>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setErrorDetail(null)}>Close</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Actions */}
      <div className={styles.actions}>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Session: {session?.startTime.toLocaleTimeString()} –{' '}
          {session?.endTime?.toLocaleTimeString() ?? 'running'}
        </Text>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            appearance="outline"
            icon={<ArrowDownloadRegular />}
            onClick={handleExport}
            disabled={results.length === 0}
          >
            Export Results
          </Button>
          <Button
            appearance="primary"
            icon={<ArrowResetRegular />}
            onClick={store.resetAll}
          >
            New Generation
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result, orgUrl, onShowError }: { result: WOCreationResult; orgUrl: string; onShowError: (r: WOCreationResult) => void }) {
  const styles = useStyles();
  const woUrl = result.workOrderId
    ? `${orgUrl}/main.aspx?etn=msdyn_workorder&id=${result.workOrderId}&pagetype=entityrecord`
    : null;

  return (
    <TableRow>
      <TableCell>
        {result.status === 'success' ? (
          <CheckmarkCircleRegular style={{ color: '#107C10', fontSize: '16px' }} />
        ) : (
          <ErrorCircleRegular style={{ color: '#D13438', fontSize: '16px' }} />
        )}
      </TableCell>
      <TableCell>
        <Text size={200}>{result.accountName}</Text>
      </TableCell>
      <TableCell>
        {result.workOrderName ? (
          <Text size={200} weight="semibold">{result.workOrderName}</Text>
        ) : (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
        )}
      </TableCell>
      <TableCell>
        <Text size={200}>
          {result.scheduledDate ? formatDate(result.scheduledDate) : '—'}
        </Text>
      </TableCell>
      <TableCell>
        {result.priorityName ? (
          <Badge appearance="tint" color="informative" size="small">{result.priorityName}</Badge>
        ) : (
          <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
        )}
      </TableCell>
      <TableCell>
        <Badge
          appearance="tint"
          color={result.status === 'success' ? 'success' : 'danger'}
          size="small"
        >
          {result.status}
        </Badge>
      </TableCell>
      <TableCell>
        {result.errorMessage ? (
          <Tooltip content="Click to see full error" relationship="description">
            <span
              className={styles.errorCell}
              onClick={() => onShowError(result)}
              style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
            >
              {result.errorMessage}
            </span>
          </Tooltip>
        ) : (
          <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
        )}
      </TableCell>
      <TableCell>
        {woUrl && (
          <Tooltip content="Open in Dynamics 365" relationship="label">
            <Button
              appearance="transparent"
              icon={<OpenRegular />}
              size="small"
              as="a"
              href={woUrl}
              target="_blank"
              rel="noopener noreferrer"
            />
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const styles = useStyles();
  return (
    <div className={styles.statCard}>
      <div>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
          {label}
        </Text>
        <Text weight="semibold" size={500} style={{ color }}>
          {value}
        </Text>
      </div>
    </div>
  );
}

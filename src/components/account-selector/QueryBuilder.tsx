import { useState, useCallback } from 'react';
import {
  Button,
  Text,
  Input,
  Select,
  makeStyles,
  tokens,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Tooltip,
  Divider,
  Field,
} from '@fluentui/react-components';
import {
  AddRegular,
  DeleteRegular,
  SearchRegular,
  SelectAllOnRegular,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { v4 as uuidv4 } from 'uuid';
import { queryAccounts } from '../../api/accountApi';
import { useGeneratorStore } from '../../store/generatorStore';
import type { FilterCondition, FilterOperator, AccountFilterField } from '../../types/generator';
import type { ServiceAccount } from '../../types/fieldService';

const FILTER_FIELDS: AccountFilterField[] = [
  { key: 'name', label: 'Account Name', type: 'string', operators: ['contains', 'startswith', 'eq', 'ne'] },
  { key: 'address1_city', label: 'City', type: 'string', operators: ['eq', 'contains', 'ne', 'startswith'] },
  { key: 'address1_stateorprovince', label: 'State / Province', type: 'string', operators: ['eq', 'ne', 'contains'] },
  { key: 'address1_postalcode', label: 'Postal Code', type: 'string', operators: ['eq', 'startswith', 'contains'] },
  { key: 'address1_country', label: 'Country', type: 'string', operators: ['eq', 'ne', 'contains'] },
  { key: 'address1_line1', label: 'Street Address', type: 'string', operators: ['contains', 'startswith'] },
];

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'Equals',
  ne: 'Not equals',
  contains: 'Contains',
  startswith: 'Starts with',
  endswith: 'Ends with',
  gt: 'Greater than',
  lt: 'Less than',
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  filterActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  results: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tableWrapper: {
    maxHeight: '320px',
    overflowY: 'auto',
  },
  selectedBadge: {
    backgroundColor: '#0078D4',
    color: 'white',
  },
  coordCell: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
});

interface QueryBuilderProps {
  orgUrl?: string;
}

export function QueryBuilder({ orgUrl }: QueryBuilderProps) {
  const styles = useStyles();
  const store = useGeneratorStore();

  const [localFilters, setLocalFilters] = useState<FilterCondition[]>(store.queryFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ServiceAccount[]>(store.queriedAccounts);
  const [totalCount, setTotalCount] = useState(0);

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: uuidv4(),
      field: FILTER_FIELDS[0].key,
      operator: 'contains',
      value: '',
    };
    setLocalFilters((prev) => [...prev, newFilter]);
  };

  const updateFilter = (id: string, changes: Partial<FilterCondition>) => {
    setLocalFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...changes } : f))
    );
  };

  const removeFilter = (id: string) => {
    setLocalFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const runQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    store.setQueryFilters(localFilters);
    try {
      const result = await queryAccounts(localFilters, 500, orgUrl);
      setResults(result.accounts);
      setTotalCount(result.totalCount);
      store.setQueriedAccounts(result.accounts);
    } catch (err) {
      setError(`Query failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [localFilters, orgUrl, store]);

  const toggleAccount = (account: ServiceAccount) => {
    store.toggleAccountSelected(account);
  };

  const selectAll = () => {
    store.setSelectedAccounts(results);
  };

  const clearSelection = () => {
    store.clearAccountSelection();
  };

  const isSelected = (account: ServiceAccount) =>
    store.selectedAccounts.some((a) => a.accountid === account.accountid);

  const selectedFromResults = results.filter((a) => isSelected(a));

  return (
    <div className={styles.root}>
      {/* Filter rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        {localFilters.map((filter) => {
          const fieldDef = FILTER_FIELDS.find((f) => f.key === filter.field) ?? FILTER_FIELDS[0];
          return (
            <div key={filter.id} className={styles.filterRow}>
              {/* Field selector */}
              <Field label="Field" style={{ flex: '0 0 180px' }}>
                <Select
                  value={filter.field}
                  onChange={(_, d) =>
                    updateFilter(filter.id, {
                      field: d.value,
                      operator: FILTER_FIELDS.find((f) => f.key === d.value)?.operators[0] ?? 'eq',
                    })
                  }
                >
                  {FILTER_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </Select>
              </Field>

              {/* Operator selector */}
              <Field label="Operator" style={{ flex: '0 0 140px' }}>
                <Select
                  value={filter.operator}
                  onChange={(_, d) => updateFilter(filter.id, { operator: d.value as FilterOperator })}
                >
                  {fieldDef.operators.map((op) => (
                    <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                  ))}
                </Select>
              </Field>

              {/* Value input */}
              <Field label="Value" style={{ flex: 1 }}>
                <Input
                  value={filter.value}
                  onChange={(_, d) => updateFilter(filter.id, { value: d.value })}
                  placeholder="Filter value..."
                  onKeyDown={(e) => e.key === 'Enter' && runQuery()}
                />
              </Field>

              {/* Remove button */}
              <Tooltip content="Remove filter" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  onClick={() => removeFilter(filter.id)}
                  style={{ marginBottom: '2px' }}
                />
              </Tooltip>
            </div>
          );
        })}
      </div>

      {/* Filter actions */}
      <div className={styles.filterActions}>
        <Button appearance="outline" icon={<AddRegular />} onClick={addFilter} size="small">
          Add Filter
        </Button>
        <Button
          appearance="primary"
          icon={loading ? <Spinner size="tiny" /> : <SearchRegular />}
          onClick={runQuery}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Accounts'}
        </Button>
        {results.length > 0 && (
          <>
            <Button appearance="subtle" icon={<SelectAllOnRegular />} onClick={selectAll} size="small">
              Select All ({results.length})
            </Button>
            {store.selectedAccounts.length > 0 && (
              <Button appearance="subtle" icon={<DismissCircleRegular />} onClick={clearSelection} size="small">
                Clear Selection
              </Button>
            )}
            <Badge appearance="filled" color="brand">
              {store.selectedAccounts.length} selected
            </Badge>
          </>
        )}
      </div>

      {error && (
        <Text style={{ color: tokens.colorPaletteRedForeground1, fontSize: tokens.fontSizeBase200 }}>
          {error}
        </Text>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <Text weight="semibold" size={300}>
              Results — {totalCount} account{totalCount !== 1 ? 's' : ''} with geo-coordinates
            </Text>
            <Badge appearance="tint" color="informative">
              {selectedFromResults.length} / {results.length} selected
            </Badge>
          </div>
          <div className={styles.tableWrapper}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell style={{ width: '48px' }}></TableHeaderCell>
                  <TableHeaderCell>Account Name</TableHeaderCell>
                  <TableHeaderCell>City</TableHeaderCell>
                  <TableHeaderCell>State</TableHeaderCell>
                  <TableHeaderCell>Coordinates</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((account) => (
                  <TableRow
                    key={account.accountid}
                    onClick={() => toggleAccount(account)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected(account)}
                        onChange={() => toggleAccount(account)}
                      />
                    </TableCell>
                    <TableCell>
                      <Text weight={isSelected(account) ? 'semibold' : 'regular'}>
                        {account.name}
                      </Text>
                    </TableCell>
                    <TableCell>{account.address1_city ?? '—'}</TableCell>
                    <TableCell>{account.address1_stateorprovince ?? '—'}</TableCell>
                    <TableCell>
                      <span className={styles.coordCell}>
                        {account.address1_latitude?.toFixed(4)},{' '}
                        {account.address1_longitude?.toFixed(4)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {results.length === 0 && !loading && (
        <div
          style={{
            textAlign: 'center',
            padding: tokens.spacingVerticalXXL,
            color: tokens.colorNeutralForeground3,
            border: `2px dashed ${tokens.colorNeutralStroke2}`,
            borderRadius: tokens.borderRadiusMedium,
          }}
        >
          <SearchRegular fontSize="32px" style={{ opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
          <Text>Add filters and click <strong>Search Accounts</strong> to find Service Accounts with geo-coordinates.</Text>
        </div>
      )}
    </div>
  );
}

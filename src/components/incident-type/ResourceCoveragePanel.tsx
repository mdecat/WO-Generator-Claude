import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Text,
  Badge,
  Spinner,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  PeopleRegular,
  LocationRegular,
  CalendarRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import {
  getResourcesForCharacteristics,
  resourceTypeLabel,
  type ResourceCoverageEntry,
} from '../../api/resourceApi';
import type { IncidentTypeCharacteristic } from '../../types/fieldService';

const useStyles = makeStyles({
  surface: {
    maxWidth: '900px',
    width: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    overflow: 'hidden',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    maxHeight: '480px',
  },
  skillBadge: {
    fontSize: tokens.fontSizeBase100,
  },
  territoryList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
  coverageBar: {
    height: '8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  coverageFill: {
    height: '100%',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: '#0078D4',
  },
});

interface ResourceCoveragePanelProps {
  open: boolean;
  onClose: () => void;
  characteristics: IncidentTypeCharacteristic[];
  incidentTypeName: string;
  orgUrl?: string;
}

export function ResourceCoveragePanel({
  open,
  onClose,
  characteristics,
  incidentTypeName,
  orgUrl,
}: ResourceCoveragePanelProps) {
  const styles = useStyles();
  const [entries, setEntries] = useState<ResourceCoverageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredCount = characteristics.length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const charIds = characteristics.map((c) => c._msdyn_characteristic_value).filter(Boolean);
      const result = await getResourcesForCharacteristics(charIds, orgUrl);
      // Sort: most matched characteristics first, then by name
      result.sort((a, b) => b.matchedCharacteristics.length - a.matchedCharacteristics.length || a.resource.name.localeCompare(b.resource.name));
      setEntries(result);
      setLoaded(true);
    } catch (err) {
      setError(`Failed to load resource coverage: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [characteristics, orgUrl]);

  // Auto-load when opened
  const handleOpen = useCallback(() => {
    if (!loaded && !loading) load();
  }, [loaded, loading, load]);

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => {
        if (d.open) handleOpen();
        else onClose();
      }}
    >
      <DialogSurface className={styles.surface}>
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PeopleRegular style={{ fontSize: '20px', color: '#0078D4' }} />
            Resource Coverage — {incidentTypeName}
          </div>
        </DialogTitle>
        <DialogBody className={styles.body}>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, overflow: 'hidden' }}>

            {/* Required skills summary */}
            {requiredCount > 0 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Required skills:</Text>
                {characteristics.map((c) => (
                  <Badge
                    key={c.msdyn_incidenttypecharacteristicid}
                    appearance="tint"
                    color="informative"
                    size="small"
                    className={styles.skillBadge}
                  >
                    {c['_msdyn_characteristic_value@OData.Community.Display.V1.FormattedValue'] ?? c.msdyn_name}
                  </Badge>
                ))}
              </div>
            )}
            {requiredCount === 0 && (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
                No characteristics defined for this incident type. Showing all available resources is not supported.
              </Text>
            )}

            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px' }}>
                <Spinner size="small" />
                <Text>Loading resource coverage...</Text>
              </div>
            )}

            {loaded && !loading && (
              <>
                {/* Stats bar */}
                <div className={styles.summary}>
                  <Text size={300} weight="semibold">
                    {entries.length} bookable resource{entries.length !== 1 ? 's' : ''} with matching skills
                  </Text>
                  {requiredCount > 0 && (
                    <>
                      <Badge appearance="tint" color="success" size="medium">
                        {entries.filter((e) => e.matchedCharacteristics.length === requiredCount).length} fully qualified
                      </Badge>
                      <Badge appearance="tint" color="warning" size="medium">
                        {entries.filter((e) => e.matchedCharacteristics.length < requiredCount).length} partial match
                      </Badge>
                    </>
                  )}
                </div>

                {entries.length === 0 ? (
                  <div className={styles.emptyState}>
                    <PeopleRegular style={{ fontSize: '32px', opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                    <Text>No bookable resources found with these characteristics.</Text>
                  </div>
                ) : (
                  <div className={styles.tableWrapper}>
                    <Table size="small">
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>Resource</TableHeaderCell>
                          <TableHeaderCell>Type</TableHeaderCell>
                          <TableHeaderCell>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <LocationRegular style={{ fontSize: '14px' }} /> Territories
                            </span>
                          </TableHeaderCell>
                          {requiredCount > 0 && (
                            <TableHeaderCell>Skills Match</TableHeaderCell>
                          )}
                          <TableHeaderCell>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CalendarRegular style={{ fontSize: '14px' }} /> Upcoming Bookings
                            </span>
                          </TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => {
                          const isFullMatch = requiredCount > 0 && entry.matchedCharacteristics.length === requiredCount;
                          const matchRatio = requiredCount > 0 ? entry.matchedCharacteristics.length / requiredCount : 1;
                          return (
                            <TableRow key={entry.resource.bookableresourceid}>
                              <TableCell>
                                <Text size={200} weight={isFullMatch ? 'semibold' : 'regular'}>
                                  {entry.resource.name}
                                </Text>
                              </TableCell>
                              <TableCell>
                                <Badge appearance="outline" size="small">
                                  {resourceTypeLabel(entry.resource.resourcetype)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {entry.territories.length === 0 ? (
                                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
                                ) : (
                                  <div className={styles.territoryList}>
                                    {entry.territories.map((t) => (
                                      <Badge key={t} appearance="tint" color="subtle" size="small">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              {requiredCount > 0 && (
                                <TableCell>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                                    <div className={styles.coverageBar} style={{ flex: 1 }}>
                                      <div
                                        className={styles.coverageFill}
                                        style={{
                                          width: `${matchRatio * 100}%`,
                                          backgroundColor: isFullMatch ? '#107C10' : matchRatio > 0.5 ? '#F7630C' : '#D13438',
                                        }}
                                      />
                                    </div>
                                    <Text size={100} style={{ whiteSpace: 'nowrap', color: tokens.colorNeutralForeground3 }}>
                                      {entry.matchedCharacteristics.length}/{requiredCount}
                                    </Text>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell>
                                <Badge
                                  appearance="tint"
                                  color={entry.upcomingBookingsCount === 0 ? 'success' : entry.upcomingBookingsCount < 5 ? 'warning' : 'danger'}
                                  size="small"
                                >
                                  {entry.upcomingBookingsCount === 0
                                    ? 'None scheduled'
                                    : `${entry.upcomingBookingsCount} booking${entry.upcomingBookingsCount !== 1 ? 's' : ''}`}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {!loaded && !loading && !error && requiredCount > 0 && (
              <div className={styles.emptyState}>
                <PeopleRegular style={{ fontSize: '32px', opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                <Text>Click <strong>Load Coverage</strong> to find matching bookable resources.</Text>
              </div>
            )}
          </DialogContent>

          <DialogActions>
            <Button
              appearance="outline"
              icon={<ArrowSyncRegular />}
              onClick={load}
              disabled={loading || requiredCount === 0}
            >
              {loaded ? 'Refresh' : 'Load Coverage'}
            </Button>
            <Button appearance="primary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

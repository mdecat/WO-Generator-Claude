import { useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Badge,
  makeStyles,
  tokens,
  Spinner,
  Divider,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  ClipboardTaskRegular,
  BoxRegular,
  TimerRegular,
  TagRegular,
  PeopleRegular,
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { getIncidentTypeDetails } from '../../api/incidentTypeApi';
import { useGeneratorStore } from '../../store/generatorStore';
import { formatDuration } from '../../utils/workOrderBuilder';
import type { IncidentTypeDetails as IDetails } from '../../types/fieldService';
import { ResourceCoveragePanel } from './ResourceCoveragePanel';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  summaryRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flex: '1 1 120px',
  },
  statValue: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  tag: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
  },
  emptySection: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    paddingLeft: tokens.spacingHorizontalM,
  },
  tableCompact: {
    '& th, & td': {
      fontSize: tokens.fontSizeBase200,
      padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    },
  },
});

interface IncidentTypeDetailsProps {
  orgUrl?: string;
}

export function IncidentTypeDetails({ orgUrl }: IncidentTypeDetailsProps) {
  const styles = useStyles();
  const [coverageOpen, setCoverageOpen] = useState(false);
  const { selectedIncidentType, setIncidentTypeDetails } = useGeneratorStore();

  const { data: details, isLoading, error } = useQuery<IDetails>({
    queryKey: ['incidentTypeDetails', selectedIncidentType?.msdyn_incidenttypeid, orgUrl],
    queryFn: async () => {
      const d = await getIncidentTypeDetails(
        selectedIncidentType!.msdyn_incidenttypeid,
        orgUrl
      );
      setIncidentTypeDetails(d);
      return d;
    },
    enabled: !!selectedIncidentType,
    staleTime: 5 * 60 * 1000,
  });

  if (!selectedIncidentType) {
    return (
      <Card>
        <Text style={{ color: tokens.colorNeutralForeground3, fontStyle: 'italic' }}>
          Select an Incident Type to see its details.
        </Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
          <Spinner size="small" />
          <Text>Loading details...</Text>
        </div>
      </Card>
    );
  }

  if (error || !details) {
    return (
      <Card>
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
          Failed to load incident type details.
        </Text>
      </Card>
    );
  }

  return (
    <div className={styles.root}>
      {/* Summary Stats */}
      <div className={styles.summaryRow}>
        <StatCard
          icon={<ClipboardTaskRegular />}
          value={details.serviceTasks.length}
          label="Service Tasks"
          color="#0078D4"
        />
        <StatCard
          icon={<BoxRegular />}
          value={details.products.length}
          label="Products"
          color="#107C10"
        />
        <StatCard
          icon={<CheckmarkCircleRegular />}
          value={details.characteristics.length}
          label="Skills/Characteristics"
          color="#8764B8"
        />
        <StatCard
          icon={<TimerRegular />}
          value={formatDuration(details.totalEstimatedDuration)}
          label="Est. Duration"
          color="#D13438"
        />
      </div>

      {/* Description */}
      {details.incidentType.msdyn_description && (
        <Card>
          <Text>{details.incidentType.msdyn_description}</Text>
        </Card>
      )}

      {/* Characteristics / Skills */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <TagRegular />
            <Text weight="semibold">Skills & Characteristics</Text>
          </div>
          <Button
            appearance="outline"
            size="small"
            icon={<PeopleRegular />}
            onClick={() => setCoverageOpen(true)}
          >
            Resource Coverage
          </Button>
        </div>
        {details.characteristics.length === 0 ? (
          <Text className={styles.emptySection}>No characteristics defined</Text>
        ) : (
          <div className={styles.tag}>
            {details.characteristics.map((c) => (
              <Badge
                key={c.msdyn_incidenttypecharacteristicid}
                appearance="tint"
                color="informative"
                size="medium"
              >
                {c['_msdyn_characteristic_value@OData.Community.Display.V1.FormattedValue'] ?? c.msdyn_name}
                {c['_msdyn_ratingvalue_value@OData.Community.Display.V1.FormattedValue'] && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    · {c['_msdyn_ratingvalue_value@OData.Community.Display.V1.FormattedValue']}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Service Tasks */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <ClipboardTaskRegular />
          <Text weight="semibold">Service Tasks</Text>
        </div>
        {details.serviceTasks.length === 0 ? (
          <Text className={styles.emptySection}>No service tasks defined</Text>
        ) : (
          <Table size="small" className={styles.tableCompact}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Task Name</TableHeaderCell>
                <TableHeaderCell>Task Type</TableHeaderCell>
                <TableHeaderCell>Est. Duration</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.serviceTasks.map((t) => (
                <TableRow key={t.msdyn_incidenttypeservicetaskid}>
                  <TableCell>{t.msdyn_name}</TableCell>
                  <TableCell>
                    {t['_msdyn_tasktype_value@OData.Community.Display.V1.FormattedValue'] ?? '—'}
                  </TableCell>
                  <TableCell>{formatDuration(t.msdyn_estimatedduration ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Divider />

      {/* Products */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <BoxRegular />
          <Text weight="semibold">Products & Parts</Text>
        </div>
        {details.products.length === 0 ? (
          <Text className={styles.emptySection}>No products defined</Text>
        ) : (
          <Table size="small" className={styles.tableCompact}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Product</TableHeaderCell>
                <TableHeaderCell>Quantity</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.products.map((p) => (
                <TableRow key={p.msdyn_incidenttypeproductid}>
                  <TableCell>
                    {p['_msdyn_product_value@OData.Community.Display.V1.FormattedValue'] ?? p.msdyn_name}
                  </TableCell>
                  <TableCell>{p.msdyn_quantity ?? '—'}</TableCell>
                  <TableCell>
                    {p['_msdyn_unit_value@OData.Community.Display.V1.FormattedValue'] ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ResourceCoveragePanel
        open={coverageOpen}
        onClose={() => setCoverageOpen(false)}
        characteristics={details.characteristics}
        incidentTypeName={selectedIncidentType.msdyn_name}
        orgUrl={orgUrl}
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const styles = useStyles();
  return (
    <div className={styles.statCard}>
      <div style={{ color, fontSize: '20px' }}>{icon}</div>
      <div>
        <div className={styles.statValue} style={{ color }}>
          {value}
        </div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

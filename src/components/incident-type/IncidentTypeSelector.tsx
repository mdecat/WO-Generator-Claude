import { useState } from 'react';
import {
  Text,
  makeStyles,
  tokens,
  Spinner,
  SearchBox,
  Badge,
} from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { getIncidentTypes } from '../../api/incidentTypeApi';
import { useGeneratorStore } from '../../store/generatorStore';
import type { IncidentType } from '../../types/fieldService';
import { formatDuration } from '../../utils/workOrderBuilder';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  searchRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '400px',
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    boxShadow: `0 0 0 1px transparent`,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
      boxShadow: `0 0 0 1px ${tokens.colorNeutralStroke1Hover}`,
    },
  },
  itemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: `0 0 0 1px #0078D4`,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  itemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    padding: tokens.spacingVerticalXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  countBadge: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
});

interface IncidentTypeSelectorProps {
  orgUrl?: string;
}

export function IncidentTypeSelector({ orgUrl }: IncidentTypeSelectorProps) {
  const styles = useStyles();
  const [search, setSearch] = useState('');
  const { selectedIncidentType, setIncidentType } = useGeneratorStore();

  const { data: incidentTypes = [], isLoading, error } = useQuery({
    queryKey: ['incidentTypes', orgUrl],
    queryFn: () => getIncidentTypes(orgUrl),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = incidentTypes.filter((it) =>
    it.msdyn_name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
        <Spinner size="small" />
        <Text>Loading Incident Types...</Text>
      </div>
    );
  }

  if (error) {
    const msg = (error as Error).message ?? String(error);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Text style={{ color: tokens.colorPaletteRedForeground1, fontWeight: 600 }}>
          Failed to load Incident Types
        </Text>
        <Text style={{ color: tokens.colorPaletteRedForeground1, fontSize: '12px' }}>
          {msg}
        </Text>
        <Text style={{ color: tokens.colorNeutralForeground3, fontSize: '12px' }}>
          Requires Dynamics 365 Field Service installed in the target environment.
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.searchRow}>
        <SearchBox
          placeholder="Search incident types..."
          value={search}
          onChange={(_, d) => setSearch(d?.value ?? '')}
          style={{ flex: 1 }}
        />
        <Badge appearance="tint" color="informative">
          {filtered.length} of {incidentTypes.length}
        </Badge>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Text>No incident types found{search ? ` for "${search}"` : ''}.</Text>
          </div>
        )}
        {filtered.map((it) => (
          <IncidentTypeItem
            key={it.msdyn_incidenttypeid}
            incidentType={it}
            selected={selectedIncidentType?.msdyn_incidenttypeid === it.msdyn_incidenttypeid}
            onSelect={setIncidentType}
          />
        ))}
      </div>
    </div>
  );
}

interface IncidentTypeItemProps {
  incidentType: IncidentType;
  selected: boolean;
  onSelect: (it: IncidentType) => void;
}

function IncidentTypeItem({ incidentType, selected, onSelect }: IncidentTypeItemProps) {
  const styles = useStyles();
  return (
    <div
      className={`${styles.item} ${selected ? styles.itemSelected : ''}`}
      onClick={() => onSelect(incidentType)}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(incidentType)}
    >
      <div className={styles.itemLeft}>
        <Text className={styles.itemName}>{incidentType.msdyn_name}</Text>
        {incidentType.msdyn_description && (
          <Text className={styles.itemDesc}>{incidentType.msdyn_description}</Text>
        )}
      </div>
      {incidentType.msdyn_estimatedduration && (
        <Badge appearance="tint" color="informative" className={styles.countBadge}>
          {formatDuration(incidentType.msdyn_estimatedduration)}
        </Badge>
      )}
    </div>
  );
}

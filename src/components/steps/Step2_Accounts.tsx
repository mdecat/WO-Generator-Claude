import {
  Card,
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
  TabList,
  Tab,
} from '@fluentui/react-components';
import {
  PeopleRegular,
  ArrowRightRegular,
  ArrowLeftRegular,
  FilterRegular,
  MapRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { QueryBuilder } from '../account-selector/QueryBuilder';
import { MapSelector } from '../account-selector/MapSelector';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalM,
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    overflowY: 'auto',
    marginTop: tokens.spacingVerticalM,
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#107C10',
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
  selectionSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorBrandStroke1}`,
  },
});

export function Step2Accounts() {
  const styles = useStyles();
  const store = useGeneratorStore();
  const { orgUrl, selectedAccounts, accountSelectionMode, setAccountSelectionMode, nextStep, prevStep } = store;

  const canContinue = selectedAccounts.length > 0;

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: tokens.spacingVerticalS }}>
          <div className={styles.headerIcon}><PeopleRegular /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Text weight="semibold" size={400}>Service Account Targeting</Text>
              {selectedAccounts.length > 0 && (
                <Badge appearance="filled" color="success" size="large">
                  {selectedAccounts.length} accounts selected
                </Badge>
              )}
            </div>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Select target Service Accounts with geo-coordinates using Query Builder or Map Selection.
              Only accounts with valid latitude/longitude are shown.
            </Text>
          </div>
        </div>

        {/* Mode Tabs */}
        <TabList
          selectedValue={accountSelectionMode}
          onTabSelect={(_, d) => setAccountSelectionMode(d.value as 'query' | 'map')}
          style={{ marginBottom: tokens.spacingVerticalM }}
        >
          <Tab value="query" icon={<FilterRegular />}>
            Query / View Builder
          </Tab>
          <Tab value="map" icon={<MapRegular />}>
            Map Selection
          </Tab>
        </TabList>

        <div className={styles.cardContent}>
          {accountSelectionMode === 'query' && <QueryBuilder orgUrl={orgUrl} />}
          {accountSelectionMode === 'map' && <MapSelector orgUrl={orgUrl} />}
        </div>
      </Card>

      {/* Actions */}
      <div className={styles.actions}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={prevStep}>
          Back
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {canContinue && (
            <div className={styles.selectionSummary}>
              <PeopleRegular style={{ color: '#0078D4' }} />
              <Text size={300} weight="semibold">
                {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
              </Text>
            </div>
          )}
          <Button
            appearance="primary"
            icon={<ArrowRightRegular />}
            iconPosition="after"
            onClick={nextStep}
            disabled={!canContinue}
            size="large"
          >
            Continue to Parameters
          </Button>
        </div>
      </div>
    </div>
  );
}

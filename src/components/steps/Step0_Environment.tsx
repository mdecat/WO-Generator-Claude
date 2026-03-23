import { useState } from 'react';
import {
  Card,
  CardHeader,
  Button,
  Text,
  Input,
  makeStyles,
  tokens,
  Spinner,
  Badge,
  Divider,
  Field,
  RadioGroup,
  Radio,
} from '@fluentui/react-components';
import {
  BuildingRegular,
  ArrowRightRegular,
  CheckmarkCircleRegular,
  GlobeRegular,
} from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { discoverEnvironments } from '../../api/discoveryApi';
import { initDataverseClient } from '../../api/dataverseClient';
import { useGeneratorStore } from '../../store/generatorStore';
import { ErrorBanner } from '../shared/ErrorBanner';
import type { DataverseEnvironment } from '../../types/dataverse';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  card: {
    width: '100%',
    maxWidth: '700px',
    padding: tokens.spacingVerticalXL,
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#0078D4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px',
    flexShrink: 0,
  },
  section: {
    marginTop: tokens.spacingVerticalL,
  },
  envGrid: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    maxHeight: '320px',
    overflowY: 'auto',
  },
  envCard: {
    boxShadow: `0 0 0 1px ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalM,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ':hover': {
      boxShadow: `0 0 0 1px #0078D4`,
      backgroundColor: tokens.colorBrandBackground2,
    },
  },
  envCardSelected: {
    boxShadow: `0 0 0 1px #0078D4`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  envInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
    minWidth: 0,
  },
  envName: {
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  envUrl: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalXL,
  },
  manualInput: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-end',
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    margin: `${tokens.spacingVerticalL} 0`,
    color: tokens.colorNeutralForeground3,
  },
});

export function Step0Environment() {
  const styles = useStyles();
  const { instance } = useMsal();
  const store = useGeneratorStore();

  const [discovering, setDiscovering] = useState(false);
  const [environments, setEnvironments] = useState<DataverseEnvironment[]>([]);
  const [selectedUrl, setSelectedUrl] = useState(store.orgUrl);
  const [manualUrl, setManualUrl] = useState('');
  const [inputMode, setInputMode] = useState<'discover' | 'manual'>('discover');
  const [error, setError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState(false);

  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    try {
      const envs = await discoverEnvironments(instance);
      setEnvironments(envs);
      store.setEnvironments(envs);
      setDiscovered(true);
      // Pre-select the current org if found
      const match = envs.find((e) =>
        e.ApiUrl.toLowerCase().includes(store.orgUrl.toLowerCase().replace('https://', '').split('.')[0])
      );
      if (match) setSelectedUrl(match.ApiUrl);
    } catch (err) {
      setError(`Failed to discover environments: ${(err as Error).message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleContinue = () => {
    const url = inputMode === 'manual' ? manualUrl.trim() : selectedUrl;
    if (!url) {
      setError('Please select or enter a Dataverse environment URL.');
      return;
    }
    const normalized = url.endsWith('/') ? url.slice(0, -1) : url;
    store.setOrgUrl(normalized);
    initDataverseClient(instance, normalized);
    store.nextStep();
  };

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <CardHeader
          image={
            <div className={styles.headerIcon}>
              <BuildingRegular />
            </div>
          }
          header={
            <Text size={500} weight="semibold">Select Target Environment</Text>
          }
          description={
            <Text>Discover and connect to the Dataverse environment where you want to generate Work Orders.</Text>
          }
        />

        {error && (
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        )}

        {/* Input Mode Selection */}
        <div className={styles.section}>
          <RadioGroup
            value={inputMode}
            onChange={(_, d) => setInputMode((d?.value ?? 'discover') as 'discover' | 'manual')}
            layout="horizontal"
          >
            <Radio value="discover" label="Discover from tenant" />
            <Radio value="manual" label="Enter URL manually" />
          </RadioGroup>
        </div>

        {/* Discover Mode */}
        {inputMode === 'discover' && (
          <div className={styles.section}>
            <Button
              appearance="primary"
              icon={discovering ? <Spinner size="tiny" /> : <GlobeRegular />}
              onClick={handleDiscover}
              disabled={discovering}
            >
              {discovering ? 'Discovering...' : 'Discover Environments'}
            </Button>

            {discovered && environments.length === 0 && (
              <Text style={{ color: tokens.colorNeutralForeground3, marginTop: '12px', display: 'block' }}>
                No environments found. Try manual entry.
              </Text>
            )}

            {environments.length > 0 && (
              <div className={styles.envGrid}>
                {environments.map((env) => (
                  <div
                    key={env.Id}
                    className={`${styles.envCard} ${selectedUrl === env.ApiUrl ? styles.envCardSelected : ''}`}
                    onClick={() => setSelectedUrl(env.ApiUrl)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedUrl(env.ApiUrl)}
                  >
                    <div className={styles.envInfo}>
                      <Text className={styles.envName}>{env.FriendlyName}</Text>
                      <Text className={styles.envUrl}>{env.ApiUrl}</Text>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Badge
                        appearance="tint"
                        color={env.EnvironmentType === 'Production' ? 'success' : 'informative'}
                      >
                        {env.EnvironmentType ?? 'Sandbox'}
                      </Badge>
                      {env.IsDefault && (
                        <Badge appearance="tint" color="warning">Default</Badge>
                      )}
                      {selectedUrl === env.ApiUrl && (
                        <CheckmarkCircleRegular style={{ color: '#0078D4' }} fontSize="20px" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {inputMode === 'manual' && (
          <div className={styles.section}>
            <Field label="Dataverse Org URL" hint="e.g. https://yourorg.crm.dynamics.com">
              <Input
                value={manualUrl || store.orgUrl}
                onChange={(_, d) => setManualUrl(d?.value ?? '')}
                placeholder="https://yourorg.crm.dynamics.com"
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        )}

        <Divider style={{ margin: `${tokens.spacingVerticalL} 0` }} />

        <div className={styles.actions}>
          <Button
            appearance="primary"
            icon={<ArrowRightRegular />}
            iconPosition="after"
            onClick={handleContinue}
            size="large"
          >
            Connect & Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}

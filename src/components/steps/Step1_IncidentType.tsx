import {
  Card,
  CardHeader,
  Button,
  Text,
  makeStyles,
  tokens,
  Divider,
} from '@fluentui/react-components';
import {
  ClipboardTaskAddRegular,
  ArrowRightRegular,
  ArrowLeftRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { IncidentTypeSelector } from '../incident-type/IncidentTypeSelector';
import { IncidentTypeDetails } from '../incident-type/IncidentTypeDetails';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalL,
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: tokens.spacingHorizontalL,
    flex: 1,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    height: 'fit-content',
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },
  detailCard: {
    padding: tokens.spacingVerticalL,
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#0078D4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
  },
});

export function Step1IncidentType() {
  const styles = useStyles();
  const { selectedIncidentType, orgUrl, nextStep, prevStep } = useGeneratorStore();

  return (
    <div className={styles.root}>
      {/* Content area */}
      <div className={styles.content}>
        {/* Left: Selector */}
        <Card className={styles.card}>
          <CardHeader
            image={
              <div className={styles.headerIcon}>
                <ClipboardTaskAddRegular />
              </div>
            }
            header={<Text weight="semibold" size={400}>Incident Type</Text>}
            description={<Text size={200}>Select the Work Order template</Text>}
          />
          <Divider style={{ flexGrow: 0 }} />
          <IncidentTypeSelector orgUrl={orgUrl} />
        </Card>

        {/* Right: Details */}
        <Card className={styles.detailCard}>
          <CardHeader
            header={
              selectedIncidentType ? (
                <Text weight="semibold" size={400}>{selectedIncidentType.msdyn_name}</Text>
              ) : (
                <Text weight="semibold" size={400}>Template Details</Text>
              )
            }
            description={
              selectedIncidentType ? (
                <Text size={200}>Read-only view of all related components</Text>
              ) : (
                <Text size={200}>Select an Incident Type to view its details</Text>
              )
            }
          />
          <Divider style={{ flexGrow: 0 }} />
          <IncidentTypeDetails orgUrl={orgUrl} />
        </Card>
      </div>

      {/* Footer Actions */}
      <div className={styles.actions}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular />}
          onClick={prevStep}
        >
          Back
        </Button>
        <Button
          appearance="primary"
          icon={<ArrowRightRegular />}
          iconPosition="after"
          onClick={nextStep}
          disabled={!selectedIncidentType}
          size="large"
        >
          Continue to Account Selection
        </Button>
      </div>
    </div>
  );
}

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
  SettingsRegular,
  ArrowRightRegular,
  ArrowLeftRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { WOParamsForm } from '../work-order-params/WOParamsForm';

const useStyles = makeStyles({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    gap: tokens.spacingVerticalM,
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    flex: 1,
    overflowY: 'auto',
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#8764B8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '20px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} 0`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
});

export function Step3Parameters() {
  const styles = useStyles();
  const store = useGeneratorStore();

  const canContinue = !!store.woParams;

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <CardHeader
          image={
            <div className={styles.headerIcon}>
              <SettingsRegular />
            </div>
          }
          header={<Text weight="semibold" size={400}>Work Order Parameters</Text>}
          description={
            <Text size={200}>
              Configure how the {store.selectedAccounts.length} selected account
              {store.selectedAccounts.length !== 1 ? 's' : ''} will be used to generate Work Orders.
            </Text>
          }
        />
        <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />
        <WOParamsForm orgUrl={store.orgUrl} />
      </Card>

      <div className={styles.actions}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={store.prevStep}>
          Back
        </Button>
        <Button
          appearance="primary"
          icon={<ArrowRightRegular />}
          iconPosition="after"
          onClick={store.nextStep}
          disabled={!canContinue}
          size="large"
        >
          Review & Generate
        </Button>
      </div>
    </div>
  );
}

/**
 * App — standalone entry point (non-D365, MSAL authenticated).
 */
import { useEffect } from 'react';
import { InteractionStatus } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import type { IPublicClientApplication } from '@azure/msal-browser';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  Spinner,
  Card,
} from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import { AppShell } from './components/layout/AppShell';
import { StepWizard } from './components/layout/StepWizard';
import { Step0Environment } from './components/steps/Step0_Environment';
import { Step1IncidentType } from './components/steps/Step1_IncidentType';
import { Step2Accounts } from './components/steps/Step2_Accounts';
import { Step3Parameters } from './components/steps/Step3_Parameters';
import { Step4Preview } from './components/steps/Step4_Preview';
import { Step5Results } from './components/steps/Step5_Results';
import { useGeneratorStore } from './store/generatorStore';
import { initDataverseClient } from './api/dataverseClient';
import { useAuth } from './auth/AuthContext';

const useStyles = makeStyles({
  loginScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#F3F2F1',
  },
  loginCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalXXL,
    maxWidth: '420px',
    width: '90%',
    textAlign: 'center',
  },
  logoRing: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#0078D4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,120,212,0.4)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  stepContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

function LoginScreen() {
  const styles = useStyles();
  const { inProgress } = useMsal();
  const { signIn } = useAuth();

  return (
    <div className={styles.loginScreen}>
      <Card className={styles.loginCard}>
        <div className={styles.logoRing}>⚡</div>
        <div>
          <Text size={600} weight="semibold" block>GBB Work Order Generator</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3, marginTop: '8px', display: 'block' }}>
            Dynamics 365 Field Service · Bulk Demo Data Generator
          </Text>
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, lineHeight: '1.6' }}>
          Sign in with your Microsoft account to connect to your Dynamics 365 environment.
        </Text>
        <Button
          appearance="primary"
          size="large"
          icon={inProgress !== InteractionStatus.None ? <Spinner size="tiny" /> : <PersonRegular />}
          onClick={signIn}
          disabled={inProgress !== InteractionStatus.None}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {inProgress !== InteractionStatus.None ? 'Signing in...' : 'Sign in with Microsoft'}
        </Button>
        <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>
          Requires Dynamics 365 Field Service · Microsoft 365 account
        </Text>
      </Card>
    </div>
  );
}

interface AppProps {
  msalInstance: IPublicClientApplication;
}

export default function App({ msalInstance }: AppProps) {
  const styles = useStyles();
  const { inProgress, accounts } = useMsal();
  const { isAuthenticated } = useAuth();
  const store = useGeneratorStore();

  // Initialize Dataverse client once the user authenticates
  useEffect(() => {
    if (accounts.length > 0 && store.orgUrl) {
      initDataverseClient(msalInstance, store.orgUrl);
    }
  }, [accounts, msalInstance, store.orgUrl]);

  const isLoading =
    inProgress === InteractionStatus.Startup ||
    inProgress === InteractionStatus.HandleRedirect;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size="large" label="Initializing..." />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  const currentStep = store.currentStep;

  return (
    <AppShell onSwitchEnvironment={() => store.setStep('environment')}>
      <div className={styles.content}>
        {currentStep !== 'environment' && <StepWizard />}
        <div className={styles.stepContent}>
          {currentStep === 'environment' && <Step0Environment />}
          {currentStep === 'incident-type' && <Step1IncidentType />}
          {currentStep === 'accounts' && <Step2Accounts />}
          {currentStep === 'parameters' && <Step3Parameters />}
          {currentStep === 'preview' && <Step4Preview />}
          {currentStep === 'results' && <Step5Results />}
        </div>
      </div>
    </AppShell>
  );
}

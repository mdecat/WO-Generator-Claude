/**
 * AppXrm — entry point when running inside Dynamics 365 as a web resource.
 * Authentication is handled by the D365 session — no login screen needed.
 * The org URL is auto-detected from Xrm.Utility.getGlobalContext().
 */
import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { StepWizard } from './components/layout/StepWizard';
import { Step1IncidentType } from './components/steps/Step1_IncidentType';
import { Step2Accounts } from './components/steps/Step2_Accounts';
import { Step3Parameters } from './components/steps/Step3_Parameters';
import { Step4Preview } from './components/steps/Step4_Preview';
import { Step5Results } from './components/steps/Step5_Results';
import { useGeneratorStore } from './store/generatorStore';
import { getXrmBaseUrl, setXrmBaseUrlOverride } from './xrmContext';
import {
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogTrigger,
  Button,
  Field,
  Input,
} from '@fluentui/react-components';

const useStyles = makeStyles({
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

export function AppXrm() {
  const styles = useStyles();
  const store = useGeneratorStore();
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Auto-initialize org URL and skip straight to Step 1
  useEffect(() => {
    const orgUrl = getXrmBaseUrl();
    if (orgUrl) {
      store.setOrgUrl(orgUrl);
      // Skip environment selection — already in D365
      if (store.currentStep === 'environment') {
        store.setStep('incident-type');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchEnvironment = () => {
    setUrlInput(store.orgUrl);
    setEnvDialogOpen(true);
  };

  const handleApplyUrl = () => {
    const url = urlInput.trim().replace(/\/$/, '');
    if (url) {
      setXrmBaseUrlOverride(url);
      store.setOrgUrl(url);
      store.setStep('incident-type');
    }
    setEnvDialogOpen(false);
  };

  const currentStep = store.currentStep;

  return (
    <>
    <Dialog open={envDialogOpen} onOpenChange={(_, d) => setEnvDialogOpen(d.open)}>
      <DialogSurface>
        <DialogTitle>Switch Environment</DialogTitle>
        <DialogBody>
          <Field label="Dataverse Org URL" hint="e.g. https://yourorg.crm.dynamics.com">
            <Input
              value={urlInput}
              onChange={(_, d) => setUrlInput(d.value)}
              placeholder="https://yourorg.crm.dynamics.com"
              style={{ width: '100%' }}
            />
          </Field>
        </DialogBody>
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary">Cancel</Button>
          </DialogTrigger>
          <Button appearance="primary" onClick={handleApplyUrl}>Apply</Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
    <AppShell xrmMode onSwitchEnvironment={handleSwitchEnvironment}>
      <div className={styles.content}>
        <StepWizard />
        <div className={styles.stepContent}>
          {currentStep === 'incident-type' && <Step1IncidentType />}
          {currentStep === 'accounts' && <Step2Accounts />}
          {currentStep === 'parameters' && <Step3Parameters />}
          {currentStep === 'preview' && <Step4Preview />}
          {currentStep === 'results' && <Step5Results />}
        </div>
      </div>
    </AppShell>
    </>
  );
}

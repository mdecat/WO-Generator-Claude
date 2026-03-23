import { makeStyles, tokens, Text, mergeClasses } from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  CircleRegular,
  RecordRegular,
} from '@fluentui/react-icons';
import { useGeneratorStore } from '../../store/generatorStore';
import { WIZARD_STEPS, type WizardStep } from '../../types/generator';
import { isXrmContext } from '../../xrmContext';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowX: 'auto',
    flexShrink: 0,
  },
  stepList: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    listStyle: 'none',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  stepButtonActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  stepButtonDisabled: {
    cursor: 'default',
    opacity: 0.5,
  },
  stepIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
    flexShrink: 0,
  },
  stepIconActive: {
    backgroundColor: '#0078D4',
    color: 'white',
  },
  stepIconDone: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorPaletteGreenForeground3,
  },
  stepLabel: {
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  stepLabelActive: {
    fontWeight: tokens.fontWeightSemibold,
    color: '#0078D4',
  },
  stepLabelDone: {
    color: tokens.colorNeutralForeground2,
  },
  connector: {
    width: '32px',
    height: '2px',
    backgroundColor: tokens.colorNeutralStroke1,
    flexShrink: 0,
    margin: `0 ${tokens.spacingHorizontalXS}`,
  },
  connectorDone: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
});

export function StepWizard() {
  const styles = useStyles();
  const { currentStep, setStep } = useGeneratorStore();

  // In XRM mode, hide the 'environment' step — it's handled automatically
  const visibleSteps = isXrmContext()
    ? WIZARD_STEPS.filter((s) => s.key !== 'environment')
    : WIZARD_STEPS;

  const currentIdx = visibleSteps.findIndex((s) => s.key === currentStep);

  const handleStepClick = (step: WizardStep, idx: number) => {
    // Allow navigating back or to completed steps only
    if (idx <= currentIdx) {
      setStep(step);
    }
  };

  return (
    <nav className={styles.container} aria-label="Wizard steps">
      <ol className={styles.stepList}>
        {visibleSteps.map((step, idx) => {
          const isActive = step.key === currentStep;
          const isDone = idx < currentIdx;
          const isClickable = idx <= currentIdx;

          return (
            <li key={step.key} className={styles.step}>
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={mergeClasses(
                    styles.connector,
                    isDone && styles.connectorDone
                  )}
                />
              )}

              <button
                className={mergeClasses(
                  styles.stepButton,
                  isActive && styles.stepButtonActive,
                  !isClickable && styles.stepButtonDisabled
                )}
                onClick={() => handleStepClick(step.key, idx)}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
                title={step.description}
              >
                {/* Step Icon */}
                <div
                  className={mergeClasses(
                    styles.stepIcon,
                    isActive && styles.stepIconActive,
                    isDone && styles.stepIconDone
                  )}
                >
                  {isDone ? (
                    <CheckmarkCircleRegular fontSize="16px" />
                  ) : isActive ? (
                    <RecordRegular fontSize="16px" />
                  ) : (
                    <CircleRegular fontSize="16px" style={{ color: tokens.colorNeutralForeground4 }} />
                  )}
                </div>

                {/* Label */}
                <Text
                  className={mergeClasses(
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone
                  )}
                >
                  {step.label}
                </Text>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

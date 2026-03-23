import {
  Spinner,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXXL,
    minHeight: '200px',
  },
  message: {
    color: tokens.colorNeutralForeground2,
  },
});

interface LoadingStateProps {
  message?: string;
  size?: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | 'huge';
}

export function LoadingState({ message = 'Loading...', size = 'large' }: LoadingStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Spinner size={size} label={message} />
    </div>
  );
}

interface InlineSpinnerProps {
  message?: string;
}

export function InlineSpinner({ message }: InlineSpinnerProps) {
  const styles = makeStyles({
    root: {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacingHorizontalS,
    },
  })();
  return (
    <span className={styles.root}>
      <Spinner size="tiny" />
      {message && <Text size={200}>{message}</Text>}
    </span>
  );
}

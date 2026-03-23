import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Button,
  Tooltip,
  Badge,
  Divider,
} from '@fluentui/react-components';
import {
  SignOutRegular,
  BuildingRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../../auth/AuthContext';
import { useGeneratorStore } from '../../store/generatorStore';
import { isXrmContext } from '../../xrmContext';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${tokens.spacingHorizontalXL}`,
    height: '56px',
    backgroundColor: '#0078D4',
    flexShrink: 0,
    boxShadow: tokens.shadow4,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  appTitle: {
    color: 'white',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    letterSpacing: '0.01em',
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: tokens.fontSizeBase200,
  },
  orgPill: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(255,255,255,0.15)',
    cursor: 'default',
  },
  orgPillClickable: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
  },
  orgText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    color: 'white',
    ':hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusMedium,
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  xrmBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: 'white',
    fontSize: '10px',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
});

interface AppShellProps {
  children: React.ReactNode;
  onSwitchEnvironment?: () => void;
  xrmMode?: boolean;
}

export function AppShell({ children, onSwitchEnvironment, xrmMode = false }: AppShellProps) {
  const styles = useStyles();
  const { user, signOut } = useAuth();
  const orgUrl = useGeneratorStore((s) => s.orgUrl);

  const orgName = orgUrl
    .replace('https://', '')
    .replace('.crm.dynamics.com', '')
    .replace(/\.crm\d*$/, '');

  const inXrm = xrmMode || isXrmContext();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoIcon}>⚡</div>
          <div>
            <div className={styles.appTitle}>GBB Work Order Generator</div>
            <div className={styles.appSubtitle}>Dynamics 365 Field Service</div>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Environment pill */}
          <Tooltip
            content={onSwitchEnvironment ? 'Switch environment' : 'Running inside Dynamics 365'}
            relationship="label"
          >
            <div
              className={`${styles.orgPill} ${onSwitchEnvironment ? styles.orgPillClickable : ''}`}
              onClick={onSwitchEnvironment}
              role={onSwitchEnvironment ? 'button' : undefined}
              tabIndex={onSwitchEnvironment ? 0 : undefined}
            >
              <BuildingRegular style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }} />
              <span className={styles.orgText}>{orgName}</span>
              <Badge
                appearance="filled"
                size="small"
                style={{
                  backgroundColor: inXrm ? 'rgba(16,124,16,0.7)' : 'rgba(255,255,255,0.25)',
                  color: 'white',
                  fontSize: '10px',
                }}
              >
                {inXrm ? 'D365 FS' : 'Connected'}
              </Badge>
            </div>
          </Tooltip>

          <Divider vertical style={{ height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }} />

          {/* User Avatar */}
          <Tooltip content={user?.name ?? 'User'} relationship="label">
            <Avatar name={user?.name ?? 'User'} size={28} style={{ cursor: 'pointer' }} />
          </Tooltip>

          {/* Sign Out (standalone only) */}
          {!inXrm && (
            <Tooltip content="Sign out" relationship="label">
              <Button
                appearance="transparent"
                className={styles.iconBtn}
                icon={<SignOutRegular />}
                onClick={signOut}
                aria-label="Sign out"
              />
            </Tooltip>
          )}
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}

import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
  Text,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { useState } from 'react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  intent?: 'error' | 'warning' | 'info' | 'success';
}

export function ErrorBanner({
  title,
  message,
  onDismiss,
  intent = 'error',
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <MessageBar intent={intent} style={{ marginBottom: '16px' }}>
      <MessageBarBody>
        {title && <MessageBarTitle>{title}</MessageBarTitle>}
        <Text>{message}</Text>
      </MessageBarBody>
      <MessageBarActions
        containerAction={
          <Button
            appearance="transparent"
            icon={<DismissRegular />}
            onClick={handleDismiss}
            aria-label="Dismiss"
          />
        }
      />
    </MessageBar>
  );
}

import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { handleSnoozeResponse } from '../services/reminders';

export function useSnoozeResponse(): void {
  useEffect(() => {
    // web has no scheduled notifications, so nothing to snooze there
    if (Platform.OS === 'web') return;
    // snooze pressed while app was closed, the listener below miss that one
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      handleSnoozeResponse(last);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(handleSnoozeResponse);
    return () => subscription.remove();
  }, []);
}

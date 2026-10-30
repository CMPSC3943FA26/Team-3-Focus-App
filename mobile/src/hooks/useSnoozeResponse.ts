import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { handleSnoozeResponse } from '../services/reminders';

export function useSnoozeResponse(): void {
  useEffect(() => {
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

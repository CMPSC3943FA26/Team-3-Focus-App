import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncReminders } from '../services/reminders';

export function useReminderSync(): void {
  useEffect(() => {
    syncReminders();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') syncReminders();
    });
    return () => subscription.remove();
  }, []);
}

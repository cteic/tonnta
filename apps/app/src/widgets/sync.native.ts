import { useEffect } from 'react';

import { AppState } from 'react-native';

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { refreshVerdictWidget } from './refresh';

export const VERDICT_REFRESH_TASK = 'tonnta-verdict-widget-refresh';

/** Minutes. The OS treats this as a floor and runs the task when it suits it. */
const REFRESH_INTERVAL_MIN = 60;

// Task definitions must run at module load, before the OS can wake the app for one.
TaskManager.defineTask(VERDICT_REFRESH_TASK, async () => {
  const ok = await refreshVerdictWidget();
  return ok
    ? BackgroundTask.BackgroundTaskResult.Success
    : BackgroundTask.BackgroundTaskResult.Failed;
});

async function registerBackgroundRefresh(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(VERDICT_REFRESH_TASK)) return;
  await BackgroundTask.registerTaskAsync(VERDICT_REFRESH_TASK, {
    minimumInterval: REFRESH_INTERVAL_MIN,
  });
}

/** Refresh the widget when the app opens or returns to the foreground, and keep it fresh in the background. */
export function useVerdictWidgetSync(): void {
  useEffect(() => {
    void refreshVerdictWidget();
    registerBackgroundRefresh().catch(() => {
      // Background refresh is best effort; foreground refresh still runs.
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshVerdictWidget();
      }
    });
    return () => subscription.remove();
  }, []);
}

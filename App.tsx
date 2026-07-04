import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { DevDashboardScreen } from './src/screens/DevDashboardScreen';
import { useUI } from './src/state/ui';
import { getAnalytics, trackEvent } from './src/telemetry/analytics';

/** Session lifecycle: session_start on first mount, session_end on background,
 *  and a fresh session_start on foreground. */
function useSessionTelemetry() {
  const sessionStartAt = useRef<number>(Date.now());
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const a = getAnalytics();
    trackEvent({
      type: 'session_start',
      appVersion: '0.5.0',
    });
    const sub = AppState.addEventListener('change', (next) => {
      const now = Date.now();
      if (
        appState.current === 'active' &&
        (next === 'background' || next === 'inactive')
      ) {
        trackEvent({
          type: 'session_end',
          durationMs: now - sessionStartAt.current,
        });
        void a.flush();
      } else if (
        (appState.current === 'background' ||
          appState.current === 'inactive') &&
        next === 'active'
      ) {
        a.newSession(now);
        sessionStartAt.current = now;
        trackEvent({
          type: 'session_start',
          appVersion: '0.5.0',
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  useSessionTelemetry();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {screen === 'hub' ? (
        <HubScreen />
      ) : screen === 'dev' ? (
        <DevDashboardScreen />
      ) : (
        <GameScreen />
      )}
    </GestureHandlerRootView>
  );
}

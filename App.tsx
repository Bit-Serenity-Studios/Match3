import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { StoreScreen } from './src/screens/StoreScreen';
import { PassScreen } from './src/screens/PassScreen';
import { DevDashboardScreen } from './src/screens/DevDashboardScreen';
import { DailyScreen } from './src/screens/DailyScreen';
import { useUI } from './src/state/ui';
import { useTelemetry } from './src/telemetry/logger';
import { useRetention } from './src/state/retention';

const APP_VERSION = '0.4.0';

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  const startSession = useTelemetry((s) => s.startSession);
  const endSession = useTelemetry((s) => s.endSession);
  const refreshCalendar = useRetention((s) => s.refreshCalendar);

  useEffect(() => {
    startSession(Date.now(), APP_VERSION);
    refreshCalendar(Date.now());
    return () => {
      endSession(Date.now());
    };
  }, [startSession, endSession, refreshCalendar]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {screen === 'hub' ? (
        <HubScreen />
      ) : screen === 'store' ? (
        <StoreScreen />
      ) : screen === 'pass' ? (
        <PassScreen />
      ) : screen === 'devDashboard' ? (
        <DevDashboardScreen />
      ) : screen === 'daily' ? (
        <DailyScreen />
      ) : (
        <GameScreen />
      )}
    </GestureHandlerRootView>
  );
}

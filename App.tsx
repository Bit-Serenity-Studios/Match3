import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { StoreScreen } from './src/screens/StoreScreen';
import { PassScreen } from './src/screens/PassScreen';
import { DevDashboardScreen } from './src/screens/DevDashboardScreen';
import { useUI } from './src/state/ui';
import { useTelemetry } from './src/telemetry/logger';

const APP_VERSION = '0.4.0';

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  const startSession = useTelemetry((s) => s.startSession);
  const endSession = useTelemetry((s) => s.endSession);

  useEffect(() => {
    startSession(Date.now(), APP_VERSION);
    return () => {
      endSession(Date.now());
    };
  }, [startSession, endSession]);

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
      ) : (
        <GameScreen />
      )}
    </GestureHandlerRootView>
  );
}

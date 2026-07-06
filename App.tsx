import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SplashScreen } from './src/screens/SplashScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { StoreScreen } from './src/screens/StoreScreen';
import { PassScreen } from './src/screens/PassScreen';
import { DevDashboardScreen } from './src/screens/DevDashboardScreen';
import { DailyScreen } from './src/screens/DailyScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { HomeHubScreen } from './src/screens/HomeHubScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MoonriseScreen } from './src/screens/MoonriseScreen';
import { CovensScreen } from './src/screens/CovensScreen';
import { GrimoireScreen } from './src/screens/GrimoireScreen';
import { TosModal } from './src/screens/TosModal';
import { useUI } from './src/state/ui';
import { useTelemetry } from './src/telemetry/logger';
import { useRetention } from './src/state/retention';
import { useProfile } from './src/state/profile';

const APP_VERSION = '0.5.0';

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  const startSession = useTelemetry((s) => s.startSession);
  const endSession = useTelemetry((s) => s.endSession);
  const refreshCalendar = useRetention((s) => s.refreshCalendar);
  const tosAcceptedAt = useProfile((s) => s.tosAcceptedAt);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    startSession(Date.now(), APP_VERSION);
    refreshCalendar(Date.now());
    return () => {
      endSession(Date.now());
    };
  }, [startSession, endSession, refreshCalendar]);

  // Gate every playable surface behind TOS acceptance. Only the Privacy
  // Policy screen is reachable pre-accept so players can review it.
  const needsTos = tosAcceptedAt === 0 && screen !== 'privacy';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!splashDone ? (
        <SplashScreen onDone={() => setSplashDone(true)} />
      ) : needsTos ? (
        <TosModal />
      ) : screen === 'menu' ? (
        <MenuScreen />
      ) : screen === 'home' ? (
        <HomeHubScreen />
      ) : screen === 'hub' ? (
        <HubScreen />
      ) : screen === 'store' ? (
        <StoreScreen />
      ) : screen === 'pass' ? (
        <PassScreen />
      ) : screen === 'devDashboard' ? (
        <DevDashboardScreen />
      ) : screen === 'daily' ? (
        <DailyScreen />
      ) : screen === 'privacy' ? (
        <PrivacyScreen />
      ) : screen === 'about' ? (
        <AboutScreen />
      ) : screen === 'settings' ? (
        <SettingsScreen />
      ) : screen === 'moonrise' ? (
        <MoonriseScreen />
      ) : screen === 'covens' ? (
        <CovensScreen />
      ) : screen === 'grimoire' ? (
        <GrimoireScreen />
      ) : (
        <GameScreen />
      )}
    </GestureHandlerRootView>
  );
}

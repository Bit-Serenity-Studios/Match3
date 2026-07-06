import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SplashScreen } from './src/screens/SplashScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { StoreScreen } from './src/screens/StoreScreen';
import { PassScreen } from './src/screens/PassScreen';
import { DevDashboardScreen } from './src/screens/DevDashboardScreen';
import { DailyScreen } from './src/screens/DailyScreen';
import { HomeHubScreen } from './src/screens/HomeHubScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MoonriseScreen } from './src/screens/MoonriseScreen';
import { CovensScreen } from './src/screens/CovensScreen';
import { GrimoireScreen } from './src/screens/GrimoireScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PlaceholderScreen } from './src/screens/PlaceholderScreen';
import { TosModal } from './src/screens/TosModal';
import { useUI } from './src/state/ui';
import { useTelemetry } from './src/telemetry/logger';
import { useRetention } from './src/state/retention';
import { useProfile } from './src/state/profile';
import { initSoundEngine, sfx } from './src/audio/soundEffects';
import { initMusic, refreshMusicFromProfile } from './src/audio/musicPlayer';

const APP_VERSION = '0.5.0';

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  const startSession = useTelemetry((s) => s.startSession);
  const endSession = useTelemetry((s) => s.endSession);
  const refreshCalendar = useRetention((s) => s.refreshCalendar);
  const tosAcceptedAt = useProfile((s) => s.tosAcceptedAt);
  const goToHome = useUI((s) => s.goToHome);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    startSession(Date.now(), APP_VERSION);
    refreshCalendar(Date.now());
    initSoundEngine().then(() => sfx('splash'));
    initMusic();
    // Watch the profile for any audio toggle change and reconcile the
    // music player. Music volume + enabled flag both live in the profile.
    const unsub = useProfile.subscribe(refreshMusicFromProfile);
    return () => {
      endSession(Date.now());
      unsub();
    };
  }, [startSession, endSession, refreshCalendar]);

  const needsTos = tosAcceptedAt === 0 && screen !== 'privacy';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!splashDone ? (
        <SplashScreen onDone={() => setSplashDone(true)} />
      ) : needsTos ? (
        <TosModal />
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
      ) : screen === 'profile' ? (
        <ProfileScreen />
      ) : screen === 'friends' ? (
        <PlaceholderScreen
          title="Friends"
          glyph="🐾"
          blurb="Find brewers in your circle, share ingredients, and keep tabs on each other's Moonrise duels."
          bullets={[
            'Add friends by moonpetal code',
            'See who has today\'s highest brew',
            'Gift stars when the moon is full',
            'Private duel invites',
          ]}
        />
      ) : screen === 'leaderboards' ? (
        <PlaceholderScreen
          title="Leaderboards"
          glyph="🏆"
          blurb="Weekly and all-time rankings by moonstones. Compete against covens across the garden."
          bullets={[
            'Global weekly rank',
            'Coven leaderboards',
            'Friends-only board',
            'Season-end reward tiers',
          ]}
        />
      ) : screen === 'news' ? (
        <PlaceholderScreen
          title="News"
          glyph="📰"
          blurb="Fresh moon phases, seasonal events, and patch notes from the apothecary."
          bullets={[
            'Feature announcements',
            'Event schedules',
            'Balance updates',
            'Community moments',
          ]}
        />
      ) : screen === 'joinUs' ? (
        <PlaceholderScreen
          title="Join Us"
          glyph="💌"
          blurb="The moonpetal garden grows by lantern light. Come sit at the fire — we're hiring, testing, and swapping recipes."
          bullets={[
            'Discord for players and testers',
            'Careers at Bit Serenity Studios',
            'Bug bounty for the sharp-eyed',
            'Playtest sign-ups',
          ]}
        />
      ) : screen === 'connectAccount' ? (
        <PlaceholderScreen
          title="Connect Account"
          glyph="🔗"
          blurb="Sign in to sync your progress across devices and back up your currency and companions safely."
          bullets={[
            'Sign in with Apple',
            'Sign in with Google',
            'Restore progress on a new device',
            'Merge two devices into one profile',
          ]}
        />
      ) : screen === 'support' ? (
        <PlaceholderScreen
          title="Support"
          glyph="🛟"
          blurb="Something amiss with the cauldron? Send us a note and the moon will answer."
          bullets={[
            'support@bitserenity.studio',
            'Bug reports with save-file attach',
            'IAP restore and receipt help',
            'FAQ and known issues',
          ]}
          cta={{ label: 'Contact', onPress: goToHome }}
        />
      ) : (
        <GameScreen />
      )}
    </GestureHandlerRootView>
  );
}

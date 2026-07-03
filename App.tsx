import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { HubScreen } from './src/screens/HubScreen';
import { useUI } from './src/state/ui';

export default function App(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {screen === 'hub' ? <HubScreen /> : <GameScreen />}
    </GestureHandlerRootView>
  );
}

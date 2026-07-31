import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette } from '../../theme';
import { TopHud } from './TopHud';
import { BottomNav } from './BottomNav';

/** Shell that composes TopHud + content + BottomNav. The floating HeaderMenu
 *  overlay is mounted once at the App root (so it's reachable from standalone
 *  screens too), not here. */
export function ShellFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <TopHud />
      <View style={styles.body}>{children}</View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgDeep },
  body: { flex: 1 },
});

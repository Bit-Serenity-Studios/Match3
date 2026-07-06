import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette } from '../../theme';
import { TopHud } from './TopHud';
import { BottomNav } from './BottomNav';
import { HeaderMenu } from './HeaderMenu';

/** Shell that composes TopHud + content + BottomNav, plus a floating
 *  HeaderMenu overlay when the hamburger is open. */
export function ShellFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <TopHud />
      <View style={styles.body}>{children}</View>
      <BottomNav />
      <HeaderMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgDeep },
  body: { flex: 1 },
});

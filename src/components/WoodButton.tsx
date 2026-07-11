import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

/**
 * Wooden CTA button in the Kenney "UI Pack - Adventure" idiom (CC0 look):
 * a parchment face with a wood-brown frame and a darker bottom edge for a
 * carved, 3D feel that presses in on touch. Built from StyleSheet (not a
 * 9-slice image) so it scales to any width with zero corner distortion —
 * the robust choice for React Native, and cohesive with the wooden avatar
 * frame + the web preview's wooden buttons.
 */
const WOOD = {
  face: '#f4e7c6', // parchment cream
  frame: '#8a5a2b', // wood brown
  depth: '#5c3c1c', // darker wood — the carved bottom edge
  ink: '#3a2410', // dark wood-ink text
};

export function WoodButton({
  label,
  onPress,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: WOOD.face,
    borderColor: WOOD.frame,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderBottomColor: WOOD.depth,
    borderRadius: 16,
    paddingHorizontal: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // pressed: sink the button by flattening the carved edge.
  pressed: {
    borderBottomWidth: 3,
    marginTop: 3,
  },
  label: {
    color: WOOD.ink,
    fontWeight: '900',
    fontSize: 24,
    letterSpacing: 2,
  },
});

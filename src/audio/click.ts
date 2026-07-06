import { sfx } from './soundEffects';

/**
 * Higher-order wrapper: takes an onPress handler and returns one that
 * plays a click sound first. Keeps call sites terse:
 *
 *   <Pressable onPress={click(goToStore)}>...</Pressable>
 */
export function click<T extends (...args: never[]) => unknown>(fn?: T): T {
  return ((...args: never[]) => {
    sfx('click');
    return fn?.(...args);
  }) as T;
}

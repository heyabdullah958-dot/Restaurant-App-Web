import { withSpring, withTiming, withSequence, withRepeat, Easing } from 'react-native-reanimated';

export const buttonPress = () => {
  'worklet';
  return { transform: [{ scale: withSpring(0.95) }] };
};

export const cartBounce = () => {
  'worklet';
  return { transform: [{ translateY: withSequence(withTiming(-10), withSpring(0)) }] };
};

export const slideUp = () => {
  'worklet';
  return {
    from: { opacity: 0, transform: [{ translateY: 20 }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] }
  };
};

export const fadeInScale = () => {
  'worklet';
  return {
    from: { opacity: 0, transform: [{ scale: 0.9 }] },
    to: { opacity: 1, transform: [{ scale: 1 }] }
  };
};

export const shimmerLoop = () => {
  'worklet';
  return withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
};

export const countBadgePulse = () => {
  'worklet';
  return withRepeat(
    withSequence(withTiming(1.2, { duration: 200 }), withTiming(1, { duration: 200 })),
    2, true
  );
};

export const swipeDelete = () => {
  'worklet';
  return { transform: [{ translateX: withTiming(-100) }], opacity: withTiming(0) };
};

export const staggerChildren = (index: number) => {
  'worklet';
  return {
    from: { opacity: 0, transform: [{ translateY: 10 }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
    delay: index * 100
  };
};

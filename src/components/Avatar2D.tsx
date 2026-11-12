import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type Avatar2DHandle = {
  play: () => void;
};

type Avatar2DProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const Avatar2D = forwardRef<Avatar2DHandle, Avatar2DProps>(
  function Avatar2D({ size = 180, style }, ref) {
    const jump = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const armsRaised = useRef(new Animated.Value(0)).current;
    const idleAnimation = useRef<Animated.CompositeAnimation | null>(null);
    const isMounted = useRef(true);
    const leftArmRotation = armsRaised.interpolate({
      inputRange: [0, 1],
      outputRange: ['28deg', '-55deg'],
    });
    const rightArmRotation = armsRaised.interpolate({
      inputRange: [0, 1],
      outputRange: ['-34deg', '55deg'],
    });
    const armLift = armsRaised.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -13],
    });

    const startIdleAnimation = useCallback(() => {
      idleAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(jump, {
            toValue: -3,
            duration: 900,
            useNativeDriver: false,
          }),
          Animated.timing(jump, {
            toValue: 0,
            duration: 900,
            useNativeDriver: false,
          }),
        ]),
      );
      idleAnimation.current.start();
    }, [jump]);

    useEffect(() => {
      isMounted.current = true;
      startIdleAnimation();
      return () => {
        isMounted.current = false;
        idleAnimation.current?.stop();
      };
    }, [startIdleAnimation]);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          idleAnimation.current?.stop();
          jump.setValue(0);
          glow.setValue(0);
          armsRaised.setValue(0);
          Animated.parallel([
            Animated.sequence([
              Animated.timing(jump, {
                toValue: -22,
                duration: 220,
                useNativeDriver: false,
              }),
              Animated.spring(jump, {
                toValue: 0,
                speed: 14,
                bounciness: 12,
                useNativeDriver: false,
              }),
            ]),
            Animated.sequence([
              Animated.timing(glow, {
                toValue: 1,
                duration: 120,
                useNativeDriver: false,
              }),
              Animated.delay(650),
              Animated.timing(glow, {
                toValue: 0,
                duration: 230,
                useNativeDriver: false,
              }),
            ]),
            Animated.sequence([
              Animated.timing(armsRaised, {
                toValue: 1,
                duration: 220,
                useNativeDriver: false,
              }),
              Animated.delay(350),
              Animated.timing(armsRaised, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
            ]),
          ]).start(() => {
            if (isMounted.current) {
              startIdleAnimation();
            }
          });
        },
      }),
      [armsRaised, glow, jump, startIdleAnimation],
    );

    return (
      <View
        pointerEvents="none"
        style={[styles.container, { width: size, height: size }, style]}
      >
        <View style={[styles.avatarStage, { transform: [{ scale: size / 128 }] }]}>
          <Animated.View style={[styles.neonHalo, { opacity: glow }]} />
          <Animated.View style={[styles.person, { transform: [{ translateY: jump }] }]}>
            <Animated.View
              style={[
                styles.backArm,
                { transform: [{ translateY: armLift }, { rotate: leftArmRotation }] },
              ]}
            />
            <Animated.View
              style={[
                styles.frontArm,
                { transform: [{ translateY: armLift }, { rotate: rightArmRotation }] },
              ]}
            />
            <View style={styles.backLeg} />
            <View style={styles.frontLeg} />
            <View style={styles.body}>
              <View style={styles.shirtStripe} />
            </View>
            <View style={styles.neck} />
            <View style={styles.head}>
              <View style={styles.headband} />
              <View style={styles.face}>
                <View style={styles.eyes}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>
                <View style={styles.smile} />
              </View>
            </View>
            <View style={styles.backShoe} />
            <View style={styles.frontShoe} />
          </Animated.View>
          <View style={styles.groundRing} />
        </View>
      </View>
    );
  },
);

export default Avatar2D;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarStage: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonHalo: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(0, 200, 150, 0.18)',
    borderWidth: 2,
    borderColor: '#00C896',
    shadowColor: '#00FF9D',
    shadowOpacity: 0.95,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  person: {
    position: 'absolute',
    width: 78,
    height: 106,
    top: 8,
    alignItems: 'center',
  },
  head: {
    position: 'absolute',
    top: 5,
    width: 27,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D99570',
    borderWidth: 2,
    borderColor: '#F6C39C',
    zIndex: 2,
  },
  headband: {
    position: 'absolute',
    top: 3,
    left: -1,
    width: 25,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#00C896',
  },
  face: {
    position: 'absolute',
    top: 12,
    left: 5,
    alignItems: 'center',
  },
  eyes: {
    flexDirection: 'row',
    gap: 5,
  },
  eye: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#15202B',
  },
  smile: {
    width: 8,
    height: 4,
    marginTop: 2,
    borderBottomWidth: 1.5,
    borderColor: '#743F36',
    borderRadius: 6,
  },
  neck: {
    position: 'absolute',
    top: 31,
    width: 10,
    height: 10,
    backgroundColor: '#C98461',
  },
  body: {
    position: 'absolute',
    top: 35,
    width: 34,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#263A76',
    borderWidth: 1,
    borderColor: '#6079D7',
    overflow: 'hidden',
    zIndex: 1,
  },
  shirtStripe: {
    position: 'absolute',
    top: 0,
    left: 13,
    width: 6,
    height: 38,
    backgroundColor: '#00C896',
  },
  backArm: {
    position: 'absolute',
    top: 39,
    left: 13,
    width: 11,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#C98461',
  },
  frontArm: {
    position: 'absolute',
    top: 38,
    right: 12,
    width: 11,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#D99570',
  },
  backLeg: {
    position: 'absolute',
    top: 68,
    left: 24,
    width: 13,
    height: 31,
    borderRadius: 7,
    backgroundColor: '#202B50',
    transform: [{ rotate: '12deg' }],
    zIndex: 1,
  },
  frontLeg: {
    position: 'absolute',
    top: 68,
    right: 23,
    width: 13,
    height: 31,
    borderRadius: 7,
    backgroundColor: '#303D69',
    transform: [{ rotate: '-10deg' }],
    zIndex: 1,
  },
  backShoe: {
    position: 'absolute',
    bottom: 1,
    left: 15,
    width: 23,
    height: 9,
    borderRadius: 6,
    backgroundColor: '#00C896',
    transform: [{ rotate: '-8deg' }],
    zIndex: 2,
  },
  frontShoe: {
    position: 'absolute',
    bottom: 1,
    right: 12,
    width: 23,
    height: 9,
    borderRadius: 6,
    backgroundColor: '#00C896',
    transform: [{ rotate: '8deg' }],
    zIndex: 2,
  },
  groundRing: {
    position: 'absolute',
    bottom: 2,
    width: 76,
    height: 17,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 200, 150, 0.75)',
    shadowColor: '#00FF9D',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

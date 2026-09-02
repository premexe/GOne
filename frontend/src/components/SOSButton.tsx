import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Siren } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SOSButtonProps {
  onConfirmSOS: () => void;
  onQuickTap?: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onConfirmSOS, onQuickTap }) => {
  const [isHolding, setIsHolding] = useState(false);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Breathing pulse animation when idle
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePressIn = () => {
    setIsHolding(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 1400, // ~1.5s hold duration
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsHolding(false);
        holdAnim.setValue(0);
        onConfirmSOS();
      }
    });
  };

  const handlePressOut = () => {
    if (isHolding) {
      setIsHolding(false);
      Animated.timing(holdAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const size = 68;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.outerWrapper}>
      {/* Outer breathing aura */}
      <Animated.View
        style={[
          styles.pulseAura,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onQuickTap}
        style={styles.buttonCenter}
      >
        {/* SVG Progress Ring */}
        <Svg width={size} height={size} style={[styles.svgRing, { transform: [{ rotate: '-90deg' }] }]}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FFFFFF"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>


        <Siren size={26} color="#FFFFFF" />
        <Text style={styles.sosText}>{isHolding ? 'HOLDING' : 'SOS'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  pulseAura: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 59, 78, 0.25)',
  },
  buttonCenter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.status.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.status.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  svgRing: {
    position: 'absolute',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});

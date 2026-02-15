import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';

interface RunningTitleProps {
  title: string;
  speed?: number;
}

export default function RunningTitle({ title, speed = 50 }: RunningTitleProps) {
  const scrollX = useSharedValue(0);
  const [titleWidth, setTitleWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: scrollX.value }]
    };
  });

  useEffect(() => {
    if (titleWidth > containerWidth && containerWidth > 0) {
      scrollX.value = withRepeat(
        withTiming(-titleWidth, {
          duration: titleWidth * speed / 10,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      // Reset position if text fits
      scrollX.value = withTiming(0, { duration: 0 });
    }
  }, [titleWidth, containerWidth, speed]);

  return (
    <View style={styles.container}>
      <View 
        style={styles.textContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Animated.Text
          style={[styles.titleText, animatedStyle]}
          numberOfLines={1}
          onLayout={(e: any) => setTitleWidth(e.nativeEvent.layout.width)}
        >
          {title}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
  },
});


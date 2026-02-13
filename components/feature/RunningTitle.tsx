import React from 'react';
import { View, StyleSheet } from 'react-native';
import MarqueeText from '../common/MarqueeText';

interface RunningTitleProps {
  title: string;
}

export default function RunningTitle({ title }: RunningTitleProps) {
  return (
    <View style={styles.container}>
      <MarqueeText text={title} icon={false} speed={50} style={styles.marquee} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
  },
  marquee: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: '100%',
  },
});


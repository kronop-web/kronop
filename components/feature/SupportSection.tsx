import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SupporterButton } from './SupporterButton';

interface SupportSectionProps {
  itemId: string;
  isSupported: boolean;
  onSupportChange: (id: string, isSupported: boolean) => void;
}

export default function SupportSection({ itemId, isSupported, onSupportChange }: SupportSectionProps) {
  return (
    <View style={styles.container}>
      <SupporterButton
        itemId={itemId}
        isInitiallySupported={isSupported}
        onSupportChange={(id, nextSupported) => onSupportChange(id, nextSupported)}
        size="small"
        showCount={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
});


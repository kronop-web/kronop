import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import demoUserService from '../services/demoUserService';

export default memo(function SongsScreen() {
  const [demoMessage, setDemoMessage] = useState(demoUserService.getDemoMessage('songs'));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Songs</Text>
        <Text style={styles.subtitle}>{demoMessage.title}</Text>
        <Text style={styles.description}>{demoMessage.subtitle}</Text>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});

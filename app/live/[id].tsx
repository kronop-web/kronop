import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeScreen } from '../../components/layout';

export default function LiveDetailScreen() {
  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.title}>Live Stream</Text>
        <Text style={styles.subtitle}>Live stream ID will be shown here</Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

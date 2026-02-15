import React from 'react';
import { View, StyleSheet } from 'react-native';
import LiveUpload from '../components/upload/LiveUpload';

interface BridgeLiveProps {
  onClose: () => void;
}

const BridgeLive: React.FC<BridgeLiveProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <LiveUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeLive;

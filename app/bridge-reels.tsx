import React from 'react';
import { View, StyleSheet } from 'react-native';
import ReelsUpload from '../components/upload/ReelsUpload';

interface BridgeReelsProps {
  onClose: () => void;
}

const BridgeReels: React.FC<BridgeReelsProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <ReelsUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeReels;

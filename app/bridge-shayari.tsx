import React from 'react';
import { View, StyleSheet } from 'react-native';
import ShayariPhotoUpload from '../components/upload/ShayariPhotoUpload';

interface BridgeShayariProps {
  onClose: () => void;
}

const BridgeShayari: React.FC<BridgeShayariProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <ShayariPhotoUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeShayari;

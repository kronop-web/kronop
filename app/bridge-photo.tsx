import React from 'react';
import { View, StyleSheet } from 'react-native';
import PhotoUpload from '../components/upload/PhotoUpload';

interface BridgePhotoProps {
  onClose: () => void;
}

const BridgePhoto: React.FC<BridgePhotoProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <PhotoUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgePhoto;

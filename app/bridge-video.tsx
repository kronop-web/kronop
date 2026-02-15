import React from 'react';
import { View, StyleSheet } from 'react-native';
import VideoUpload from '../components/upload/VideoUpload';

interface BridgeVideoProps {
  onClose: () => void;
}

const BridgeVideo: React.FC<BridgeVideoProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <VideoUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeVideo;

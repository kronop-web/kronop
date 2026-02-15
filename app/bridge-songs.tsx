import React from 'react';
import { View, StyleSheet } from 'react-native';
import SongUpload from '../components/upload/SongUpload';

interface BridgeSongsProps {
  onClose: () => void;
}

const BridgeSongs: React.FC<BridgeSongsProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <SongUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeSongs;

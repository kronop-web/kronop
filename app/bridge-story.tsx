import React from 'react';
import { View, StyleSheet } from 'react-native';
import StoryUpload from '../components/upload/StoryUpload';

interface BridgeStoryProps {
  onClose: () => void;
}

const BridgeStory: React.FC<BridgeStoryProps> = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <StoryUpload onClose={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default BridgeStory;

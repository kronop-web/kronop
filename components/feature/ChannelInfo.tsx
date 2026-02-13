import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '../../constants/theme';

interface ChannelInfoProps {
  avatarUrl: string;
  channelName: string;
  onPress: () => void;
}

export default function ChannelInfo({ avatarUrl, channelName, onPress }: ChannelInfoProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
      </View>
      <Text style={styles.channelName} numberOfLines={1}>
        {channelName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: theme.colors.text.primary,
  },
  channelName: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flexShrink: 1,
  },
});


import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LikeButton } from './LikeButton';
import { CommentButton } from './CommentButton';
import { ShareButton } from './ShareButton';
import { theme } from '../../constants/theme';

interface InteractionBarProps {
  itemId: string;
  likes?: number;
  comments?: any[];
  shares?: number;
  isLiked?: boolean;
  isSupported?: boolean;
  onLikeChange?: (itemId: string, isLiked: boolean, count: number) => void;
  onCommentPress?: (itemId: string) => void;
  onShareChange?: (itemId: string, count: number) => void;
  size?: 'small' | 'medium' | 'large';
  showCounts?: boolean;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  itemId,
  likes = 0,
  comments = [],
  shares = 0,
  isLiked = false,
  isSupported = false,
  onLikeChange,
  onCommentPress,
  onShareChange,
  size = 'medium',
  showCounts = true
}) => {
  return (
    <View style={styles.container}>
      <LikeButton
        itemId={itemId}
        initialCount={likes}
        isInitiallyLiked={isLiked}
        onLikeChange={onLikeChange}
        size={size}
        showCount={showCounts}
      />

      <CommentButton
        itemId={itemId}
        comments={comments}
        onCommentPress={onCommentPress}
        size={size}
        showCount={showCounts}
      />

      <ShareButton
        itemId={itemId}
        initialCount={shares}
        onShareChange={onShareChange}
        size={size}
        showCount={showCounts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});

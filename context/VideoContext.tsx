import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Video, Comment } from '../types/video';
import { videoService } from '../services/videoService';

interface VideoContextType {
  videos: Video[];
  loading: boolean;
  fetchVideos: () => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;
  dislikeVideo: (videoId: string) => Promise<void>;
  shareVideo: (videoId: string) => Promise<string>;
  downloadVideo: (videoId: string) => Promise<void>;
  getVideoById: (id: string) => Promise<Video | null>;
  getComments: (videoId: string) => Promise<Comment[]>;
  addComment: (videoId: string, text: string, parentId?: string) => Promise<Comment>;
  likeComment: (commentId: string) => Promise<void>;
  searchVideos: (query: string) => Promise<Video[]>;
}

export const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await videoService.getAllVideos();
      setVideos(data);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const likeVideo = useCallback(async (videoId: string) => {
    try {
      await videoService.likeVideo(videoId);
      setVideos(prev =>
        prev.map(v =>
          v.id === videoId ? { ...v, likes: v.likes + 1 } : v
        )
      );
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  }, []);

  const getVideoById = useCallback(async (id: string) => {
    return await videoService.getVideoById(id);
  }, []);

  const getComments = useCallback(async (videoId: string) => {
    return await videoService.getVideoComments(videoId);
  }, []);

  const addComment = useCallback(async (videoId: string, text: string, parentId?: string) => {
    return await videoService.addComment(videoId, text, parentId);
  }, []);

  const likeComment = useCallback(async (commentId: string) => {
    await videoService.likeComment(commentId);
  }, []);

  const dislikeVideo = useCallback(async (videoId: string) => {
    try {
      await videoService.dislikeVideo(videoId);
      setVideos(prev =>
        prev.map(v =>
          v.id === videoId ? { ...v, dislikes: v.dislikes + 1 } : v
        )
      );
    } catch (error) {
      console.error('Failed to dislike video:', error);
    }
  }, []);

  const shareVideo = useCallback(async (videoId: string) => {
    return await videoService.shareVideo(videoId);
  }, []);

  const downloadVideo = useCallback(async (videoId: string) => {
    await videoService.downloadVideo(videoId);
  }, []);

  const searchVideos = useCallback(async (query: string) => {
    return await videoService.searchVideos(query);
  }, []);

  return (
    <VideoContext.Provider
      value={{
        videos,
        loading,
        fetchVideos,
        likeVideo,
        dislikeVideo,
        shareVideo,
        downloadVideo,
        getVideoById,
        getComments,
        addComment,
        likeComment,
        searchVideos,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export const useVideo = () => {
  const context = React.useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};

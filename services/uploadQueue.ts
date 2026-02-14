import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { bridgeManager } from './bridges';
import { API_BASE_URL } from '../constants/network';

type UploadType = 'REELS' | 'VIDEO' | 'STORY' | 'PHOTO' | 'SHAYARI' | 'LIVE' | 'SONG';

export interface UploadJob {
  type: UploadType;
  file: any;
  metadata?: any;
}

type PersistedUploadFile = {
  uri: string;
  name?: string;
  size?: number;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
};

type UploadJobStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'failed';

type VideoUploadState = {
  stage: 'create' | 'upload' | 'finalize' | 'save_metadata' | 'done';
  videoGuid?: string;
  uploadSessionId?: string;
  chunkIndex?: number;
  totalChunks?: number;
  fileSize?: number;
  startedAt?: number;
};

type PersistedUploadJob = {
  id: string;
  type: UploadType;
  file: PersistedUploadFile;
  metadata?: any;
  status: UploadJobStatus;
  attempts: number;
  nextRetryAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  videoState?: VideoUploadState;
};

type UploadJobResult = {
  success: boolean;
  error?: string;
};

const getUploaderUserId = () => {
  return 'guest_user';
};

const notifyBackend = async ({
  title,
  body,
  status,
  route,
  contentId,
  type,
  data
}: {
  title: string;
  body: string;
  status: 'success' | 'failed' | 'uploading';
  route?: string;
  contentId?: string;
  type?: string;
  data?: Record<string, any>;
}) => {
  try {
    const userId = getUploaderUserId();
    await fetch(`${API_BASE_URL}/notifications/upload-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        status,
        route: route || '',
        contentId: contentId || '',
        type: type || 'upload',
        data: data || {}
      })
    });
  } catch {
    // no-op
  }
};

const getContentLabel = (type: UploadType) => {
  switch (type) {
    case 'REELS':
      return 'Reel';
    case 'VIDEO':
      return 'Video';
    case 'STORY':
      return 'Story';
    case 'PHOTO':
      return 'Photo';
    case 'SHAYARI':
      return 'Shayari';
    case 'LIVE':
      return 'Live';
    case 'SONG':
      return 'Song';
    default:
      return 'Content';
  }
};

const ensureNotificationPermission = async () => {
  try {
    if (Constants.appOwnership === 'expo') return false;

    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
};

const showLocalNotification = async (title: string, body: string, data?: Record<string, any>) => {
  try {
    const canNotify = await ensureNotificationPermission();
    if (!canNotify) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {}
      },
      trigger: null
    });
  } catch {
    // no-op (Expo Go / unsupported environment)
  }
};

class UploadQueue {
  private static readonly STORAGE_KEY = 'kronop.upload.queue.v2';
  private queue: PersistedUploadJob[] = [];
  private processing = false;
  private initialized = false;
  private isOnline: boolean | null = null;

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    await this.loadFromStorage();

    try {
      const state = await NetInfo.fetch();
      this.isOnline = !!state.isConnected;
    } catch {
      this.isOnline = null;
    }

    NetInfo.addEventListener((state) => {
      const nowOnline = !!state.isConnected;
      const changed = this.isOnline !== nowOnline;
      this.isOnline = nowOnline;
      if (changed && nowOnline) {
        this.resumeAllPaused('network_restored');
        this.kick();
      }
    });

    await this.registerBackgroundTasks();
    this.kick();
  }

  enqueue(job: UploadJob) {
    const persisted = this.toPersistedJob(job);
    this.queue.push(persisted);
    void this.persistToStorage();
    this.kick();
  }

  private toPersistedJob(job: UploadJob): PersistedUploadJob {
    const now = Date.now();
    const id = `${job.type}_${now}_${Math.random().toString(16).slice(2)}`;

    const file: PersistedUploadFile = job?.file?.uri
      ? {
          uri: job.file.uri,
          name: job.file.name,
          size: job.file.size,
          mimeType: job.file.mimeType,
          fileName: job.file.fileName,
          fileSize: job.file.fileSize,
          type: job.file.type
        }
      : {
          uri: ''
        };

    return {
      id,
      type: job.type,
      file,
      metadata: job.metadata,
      status: 'queued',
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  private async loadFromStorage() {
    try {
      const raw = await AsyncStorage.getItem(UploadQueue.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.queue = parsed;
    } catch {
      // ignore corrupted storage
      this.queue = [];
    }
  }

  private async persistToStorage() {
    try {
      await AsyncStorage.setItem(UploadQueue.STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // ignore
    }
  }

  private updateJob(id: string, patch: Partial<PersistedUploadJob>) {
    const idx = this.queue.findIndex((j) => j.id === id);
    if (idx < 0) return;
    this.queue[idx] = {
      ...this.queue[idx],
      ...patch,
      updatedAt: Date.now()
    };
    void this.persistToStorage();
  }

  private resumeAllPaused(reason: string) {
    for (const job of this.queue) {
      if (job.status === 'paused') {
        this.updateJob(job.id, {
          status: 'queued',
          lastError: reason
        });
      }
    }
  }

  private kick() {
    if (this.processing) return;
    this.processing = true;

    void this.processLoop();
  }

  private async processLoop() {
    try {
      while (true) {
        if (this.isOnline === false) {
          return;
        }

        const now = Date.now();
        const nextIndex = this.queue.findIndex((j) => {
          if (j.status !== 'queued') return false;
          if (j.nextRetryAt && j.nextRetryAt > now) return false;
          return true;
        });

        if (nextIndex < 0) return;

        const job = this.queue[nextIndex];
        await this.processPersistedJob(job);
      }
    } finally {
      this.processing = false;
      const now = Date.now();
      const hasWork = this.queue.some((j) => j.status === 'queued' && (!j.nextRetryAt || j.nextRetryAt <= now));
      if (hasWork) this.kick();
    }
  }

  private async processPersistedJob(job: PersistedUploadJob): Promise<UploadJobResult> {
    const label = getContentLabel(job.type);

    try {
      if (!job.file?.uri) {
        throw new Error('Missing file uri');
      }

      this.updateJob(job.id, { status: 'uploading', lastError: undefined });
      await showLocalNotification(`${label} Upload`, `${label} अपलोड हो रहा है...`);

      if (job.type === 'SONG') {
        const bridge: any = bridgeManager.getBridge('song' as any);
        if (!bridge?.upload) {
          throw new Error('Song bridge is not available');
        }
        await bridge.upload(job.metadata);

        await notifyBackend({
          title: `${label} Upload Complete`,
          body: `बधाई हो! आपकी ${label} सफलतापूर्वक अपलोड हो गई है! 🚀`,
          status: 'success',
          type: 'upload',
          data: { contentType: job.type }
        });
      } else {
        // VIDEO is the most critical path: treat it as persistent state machine.
        // Other types fall back to bridgeManager as-is.
        if (job.type === 'VIDEO') {
          const result = await this.processVideoJob(job);
          const contentId = result?.video?._id || result?.data?._id;
          await notifyBackend({
            title: `${label} Upload Complete`,
            body: `बधाई हो! आपकी ${label} सफलतापूर्वक अपलोड हो गई है! 🚀`,
            status: 'success',
            route: contentId ? `/video/${contentId}` : '',
            contentId: contentId ? String(contentId) : '',
            type: 'upload',
            data: { contentType: job.type }
          });
        } else {
          const result = await bridgeManager.upload(job.type as any, job.file, job.metadata);
          if (!result?.success) {
            throw new Error(result?.error || 'Upload failed');
          }

          const contentId = result?.reel?._id || result?.video?._id || result?.data?._id;
          await notifyBackend({
            title: `${label} Upload Complete`,
            body: `बधाई हो! आपकी ${label} सफलतापूर्वक अपलोड हो गई है! 🚀`,
            status: 'success',
            route: contentId ? `/video/${contentId}` : '',
            contentId: contentId ? String(contentId) : '',
            type: 'upload',
            data: { contentType: job.type }
          });
        }
      }

      await showLocalNotification(
        `${label} Upload Complete`,
        `बधाई हो! आपकी ${label} सफलतापूर्वक अपलोड हो गई है! 🚀`
      );

      this.updateJob(job.id, { status: 'completed' });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';

      // Pause when offline, so we can resume from the same state.
      if (this.isOnline === false || /network|timeout|fetch/i.test(message)) {
        this.updateJob(job.id, {
          status: 'paused',
          lastError: message
        });
        return { success: false, error: message };
      }

      const attempts = (job.attempts || 0) + 1;
      const maxAttempts = 8;
      const backoffMs = Math.min(5 * 60_000, 1000 * Math.pow(2, Math.min(10, attempts)));
      const shouldRetry = attempts < maxAttempts;

      this.updateJob(job.id, {
        status: shouldRetry ? 'queued' : 'failed',
        attempts,
        nextRetryAt: shouldRetry ? Date.now() + backoffMs : undefined,
        lastError: message
      });

      await notifyBackend({
        title: `${label} Upload Failed`,
        body: 'अपलोड नहीं हो पाया, कृपया दोबारा कोशिश करें।',
        status: 'failed',
        type: 'upload',
        data: { contentType: job.type, error: message }
      });

      await showLocalNotification(
        `${label} Upload Failed`,
        'अपलोड नहीं हो पाया, कृपया दोबारा कोशिश करें।'
      );
      return { success: false, error: message };
    }
  }

  private async processVideoJob(job: PersistedUploadJob): Promise<any> {
    // We intentionally avoid direct imports at module top for optional environments.
    const { VideoBridge } = await import('./bridges/VideoBridge');
    const bridge = new VideoBridge();

    const metadata = job.metadata || {};
    const file = job.file;

    // Initialize state
    const state: VideoUploadState = job.videoState || {
      stage: 'create',
      chunkIndex: 0,
      startedAt: Date.now(),
      fileSize: file.size || file.fileSize
    };

    // Stage 1: create video entry
    if (state.stage === 'create') {
      const created = await bridge.createVideoEntry(file, metadata);
      state.videoGuid = created.videoGuid;
      state.stage = 'upload';
      state.chunkIndex = 0;
      this.updateJob(job.id, { videoState: state });
    }

    // Stage 2: upload
    if (state.stage === 'upload') {
      const size = state.fileSize || file.size || file.fileSize || 0;
      const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;
      if (size > LARGE_FILE_THRESHOLD) {
        const resume = await bridge.uploadVideoChunksFromUri({
          file,
          videoGuid: String(state.videoGuid),
          metadata,
          uploadSessionId: state.uploadSessionId,
          startChunkIndex: state.chunkIndex || 0
        });

        state.uploadSessionId = resume.uploadSessionId;
        state.chunkIndex = resume.nextChunkIndex;
        state.totalChunks = resume.totalChunks;
        this.updateJob(job.id, { videoState: state });

        if (!resume.done) {
          // paused due to offline / transient error handled by caller
          throw new Error('network_paused');
        }
      } else {
        await bridge.simpleUploadFromUri(file, String(state.videoGuid));
      }

      state.stage = 'finalize';
      this.updateJob(job.id, { videoState: state });
    }

    // Stage 3: finalize (Bunny chunk finalize is already performed inside uploadVideoChunksFromUri)
    if (state.stage === 'finalize') {
      state.stage = 'save_metadata';
      this.updateJob(job.id, { videoState: state });
    }

    // Stage 4: save metadata to MongoDB using existing service flow
    if (state.stage === 'save_metadata') {
      const { videosService } = await import('./videosService');
      const bunnyUrl = bridge.getVideoPlaylistUrl(String(state.videoGuid));
      const res = await videosService.saveVideoMetadataOnly({
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        category: metadata.category,
        bunny_id: String(state.videoGuid),
        url: bunnyUrl,
        userId: metadata.user_id || metadata.userId || 'guest_user'
      });

      state.stage = 'done';
      this.updateJob(job.id, { videoState: state });
      return res;
    }

    return { success: true };
  }

  private async registerBackgroundTasks() {
    // Optional: enable background queue processing if modules exist.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TaskManager = require('expo-task-manager');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BackgroundFetch = require('expo-background-fetch');
      const TASK_NAME = 'KRONOP_UPLOAD_QUEUE_PROCESSOR';

      if (!TaskManager.isTaskDefined(TASK_NAME)) {
        TaskManager.defineTask(TASK_NAME, async () => {
          try {
            await this.loadFromStorage();
            this.isOnline = (await NetInfo.fetch()).isConnected;
            this.kick();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch {
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }

      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(TASK_NAME, {
          minimumInterval: 15 * 60,
          stopOnTerminate: false,
          startOnBoot: true
        });
      }
    } catch {
      // Module not installed or not supported: ignore.
    }
  }
}

export const uploadQueue = new UploadQueue();

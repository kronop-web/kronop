const crypto = require('crypto');
const axios = require('axios');

class SignedUrlService {
  constructor() {
    this.BUNNY_CONFIG = {
      reels: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || process.env.BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || process.env.BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_REELS || process.env.BUNNY_ACCESS_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      video: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_VIDEO || process.env.BUNNY_LIBRARY_ID_VIDEO || '', 
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_VIDEO || process.env.BUNNY_HOST_VIDEO || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_VIDEO || process.env.BUNNY_ACCESS_KEY_VIDEO || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      live: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_LIVE || process.env.BUNNY_LIBRARY_ID_LIVE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_LIVE || process.env.BUNNY_HOST_LIVE || '', 
        apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_LIVE || process.env.BUNNY_ACCESS_KEY_LIVE || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      story: {
        libraryId: process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_STORY || process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID_REELS || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_STORY || process.env.EXPO_PUBLIC_BUNNY_HOST_REELS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_STORY || process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY_REELS || process.env.EXPO_PUBLIC_BUNNY_API_KEY || process.env.BUNNY_API_KEY || ''
      },
      photos: {
        storageZoneName: process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || process.env.BUNNY_STORAGE_ZONE || '',
        host: process.env.EXPO_PUBLIC_BUNNY_HOST_PHOTOS || process.env.BUNNY_HOST_PHOTOS || '',
        apiKey: process.env.EXPO_PUBLIC_BUNNY_ACCESS_KEY || process.env.BUNNY_ACCESS_KEY || ''
      }
    };
  }

  generateSignedUrl(contentType, videoId, expiresIn = 3600) {
    try {
      const config = this.BUNNY_CONFIG[contentType.toLowerCase()];
      if (config && config.host) {
        return `https://${config.host}/${videoId}/playlist.m3u8`;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  generatePhotoSignedUrl(fileName, expiresIn = 3600) {
    try {
      const config = this.BUNNY_CONFIG.photos;
      if (config && config.storageZoneName) {
        return `https://${config.host || config.storageZoneName + '.b-cdn.net'}/${fileName}`;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to generate photo signed URL: ${error.message}`);
    }
  }

  async checkBunnySecuritySettings(contentType) {
    try {
      const config = this.BUNNY_CONFIG[contentType.toLowerCase()];
      
      if (contentType.toLowerCase() === 'photos') {
        const response = await axios.get(
          `https://api.bunny.net/storagezone/${config.storageZoneName}`,
          {
            headers: {
              'AccessKey': config.apiKey,
              'accept': 'application/json'
            }
          }
        );
        return {
          hasSecurity: response.data.EnableGeoZone || false,
          hasTokenSecurity: response.data.EnableTokenAuthentication || false,
          allowedCountries: response.data.AllowedCountries || [],
          blockedCountries: response.data.BlockedCountries || []
        };
      } else {
        const response = await axios.get(
          `https://video.bunnycdn.com/library/${config.libraryId}`,
          {
            headers: {
              'AccessKey': config.apiKey,
              'accept': 'application/json'
            }
          }
        );
        return {
          hasSecurity: response.data.EnableSecurity || false,
          hasTokenSecurity: response.data.EnableTokenAuthentication || false,
          allowedCountries: response.data.AllowedCountries || [],
          blockedCountries: response.data.BlockedCountries || []
        };
      }
    } catch (error) {
      throw new Error(`Failed to check security settings: ${error.message}`);
    }
  }

  async enableBunnyTokenSecurity(contentType) {
    try {
      const config = this.BUNNY_CONFIG[contentType.toLowerCase()];
      
      if (contentType.toLowerCase() === 'photos') {
        await axios.post(
          `https://api.bunny.net/storagezone/${config.storageZoneName}`,
          {
            EnableTokenAuthentication: true,
            TokenAuthenticationCountries: [] // Empty array means all countries allowed
          },
          {
            headers: {
              'AccessKey': config.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        await axios.post(
          `https://video.bunnycdn.com/library/${config.libraryId}`,
          {
            EnableSecurity: true,
            EnableTokenAuthentication: true,
            AllowedCountries: [] // Empty array means all countries allowed
          },
          {
            headers: {
              'AccessKey': config.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      return { success: true, message: `Token security enabled for ${contentType}` };
    } catch (error) {
      throw new Error(`Failed to enable token security: ${error.message}`);
    }
  }

  generateSignedUrlsForContent(contentArray) {
    try {
      return contentArray.map(content => {
        try {
          let signedUrl = null;
          
          if (content.type === 'Photo') {
            const url = content.url || '';
            const parts = url.split('/');
            const fileName = parts[parts.length - 1] || '';
            if (fileName) {
              signedUrl = this.generatePhotoSignedUrl(fileName);
            }
          } else if (content.type && content.bunny_id) {
            signedUrl = this.generateSignedUrl(content.type, content.bunny_id);
          }
          
          return {
            ...content,
            originalUrl: content.url,
            signedUrl: signedUrl || content.url,
            urlExpiresAt: new Date(Date.now() + 3600 * 1000)
          };
        } catch (itemError) {
          return {
            ...content,
            originalUrl: content.url,
            signedUrl: content.url,
            urlExpiresAt: new Date(Date.now() + 3600 * 1000)
          };
        }
      });
    } catch (error) {
      throw new Error(`Failed to generate signed URLs: ${error.message}`);
    }
  }
}

module.exports = new SignedUrlService();

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { reelsApi , videosApi , photosApi , liveApi , storiesApi } from '../../services/api';





// Create shayari photos API
const shayariPhotosApi = {
  getShayariPhotos: async () => {
    try {
      const response = await fetch(`${process.env.KOYEB_API_URL || process.env.EXPO_PUBLIC_API_URL}/content/shayari-photos`);
      return response.json();
    } catch (error) {
      console.error('Error fetching shayari photos:', error);
      return { data: [] };
    }
  }
};

const { width } = Dimensions.get('window');

interface ContentStats {
  total: number;
  stars: number;
  comments: number;
  shares: number;
  views: number;
}

interface GrandTotal {
  totalContent: number;
  totalStars: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
}

interface SectionData {
  name: string;
  icon: string;
  color: string;
  stats: ContentStats;
  expanded: boolean;
}

export default function UserDataScreen() {
  const [loading, setLoading] = useState(true);
  const [grandTotal, setGrandTotal] = useState<GrandTotal>({
    totalContent: 0,
    totalStars: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
  });
  
  const [sections, setSections] = useState<SectionData[]>([
    { name: 'Reels', icon: 'movie', color: '#9C27B0', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
    { name: 'Videos', icon: 'videocam', color: '#FF9800', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
    { name: 'Live', icon: 'live-tv', color: '#FF0000', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
    { name: 'Story', icon: 'auto-stories', color: '#4CAF50', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
    { name: 'Photos', icon: 'photo', color: '#2196F3', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
    { name: 'Shayari Photos', icon: 'format-quote', color: '#E91E63', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }, expanded: false },
  ]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from all content APIs
      const [reelsData, videosData, photosData, liveData, storiesData, shayariPhotosData] = await Promise.all([
        reelsApi.getReels().catch(() => ({ data: [] })),
        videosApi.getVideos().catch(() => ({ data: [] })),
        photosApi.getPhotos().catch(() => ({ data: [] })),
        liveApi.getLive().catch(() => ({ data: [] })),
        storiesApi.getStories().catch(() => ({ data: [] })),
        shayariPhotosApi.getShayariPhotos().catch(() => ({ data: [] })),
      ]);

      // Calculate stats for each content type
      const calculateStats = (data: any[]): ContentStats => {
        const stats = data.reduce(
          (acc, item) => {
            acc.total += 1;
            acc.stars += item.stars || 0;
            acc.comments += item.comments || 0;
            acc.shares += item.shares || 0;
            acc.views += item.views || 0;
            return acc;
          },
          { total: 0, stars: 0, comments: 0, shares: 0, views: 0 }
        );
        return stats;
      };

      const reelsStats = calculateStats(reelsData.data || []);
      const videosStats = calculateStats(videosData.data || []);
      const photosStats = calculateStats(photosData.data || []);
      const liveStats = calculateStats(liveData.data || []);
      const storiesStats = calculateStats(storiesData.data || []);
      const shayariPhotosStats = calculateStats(shayariPhotosData.data || []);

      // Update sections with new data
      const newSections = [
        { ...sections[0], stats: reelsStats },
        { ...sections[1], stats: videosStats },
        { ...sections[2], stats: liveStats },
        { ...sections[3], stats: storiesStats },
        { ...sections[4], stats: photosStats },
        { ...sections[5], stats: shayariPhotosStats },
      ];
      setSections(newSections);

      // Calculate grand total
      const total = newSections.reduce(
        (acc, section) => {
          acc.totalContent += section.stats.total;
          acc.totalStars += section.stats.stars;
          acc.totalComments += section.stats.comments;
          acc.totalShares += section.stats.shares;
          acc.totalViews += section.stats.views;
          return acc;
        },
        { totalContent: 0, totalStars: 0, totalComments: 0, totalShares: 0, totalViews: 0 }
      );

      setGrandTotal(total);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (index: number) => {
    const newSections = [...sections];
    newSections[index].expanded = !newSections[index].expanded;
    setSections(newSections);
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Content Data</Text>
          <Text style={styles.headerSubtitle}>Complete analytics of your content</Text>
        </View>

        {/* Grand Total Summary Card */}
        <View style={styles.grandTotalCard}>
          <View style={styles.grandTotalHeader}>
            <MaterialIcons name="analytics" size={28} color="#FF0000" />
            <Text style={styles.grandTotalTitle}>Grand Total</Text>
          </View>
          
          <View style={styles.grandTotalStats}>
            <View style={styles.grandTotalStat}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.grandTotalNumber}>{grandTotal.totalStars.toLocaleString()}</Text>
              <Text style={styles.grandTotalLabel}>Total Stars</Text>
            </View>
            
            <View style={styles.grandTotalStat}>
              <MaterialIcons name="comment" size={24} color="#4CAF50" />
              <Text style={styles.grandTotalNumber}>{grandTotal.totalComments.toLocaleString()}</Text>
              <Text style={styles.grandTotalLabel}>Total Comments</Text>
            </View>
            
            <View style={styles.grandTotalStat}>
              <MaterialIcons name="share" size={24} color="#2196F3" />
              <Text style={styles.grandTotalNumber}>{grandTotal.totalShares.toLocaleString()}</Text>
              <Text style={styles.grandTotalLabel}>Total Shares</Text>
            </View>
          </View>
          
          <View style={styles.grandTotalFooter}>
            <Text style={styles.grandTotalContent}>{grandTotal.totalContent} Total Content</Text>
            <Text style={styles.grandTotalViews}>{grandTotal.totalViews.toLocaleString()} Total Views</Text>
          </View>
        </View>

        {/* Expandable Sections */}
        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionsTitle}>Content Breakdown</Text>
          
          {sections.map((section, index) => (
            <View key={section.name} style={styles.sectionCard}>
              {/* Section Header */}
              <TouchableOpacity 
                style={styles.sectionHeader} 
                onPress={() => toggleSection(index)}
              >
                <View style={styles.sectionLeft}>
                  <MaterialIcons name={section.icon as any} size={24} color={section.color} />
                  <Text style={styles.sectionName}>{section.name}</Text>
                </View>
                
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionCount}>{section.stats.total} items</Text>
                  <MaterialIcons 
                    name={section.expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#FF0000" 
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {section.expanded && (
                <View style={styles.sectionDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="star" size={20} color="#FFD700" />
                      <Text style={styles.detailNumber}>{section.stats.stars.toLocaleString()}</Text>
                      <Text style={styles.detailLabel}>Stars</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <MaterialIcons name="comment" size={20} color="#4CAF50" />
                      <Text style={styles.detailNumber}>{section.stats.comments.toLocaleString()}</Text>
                      <Text style={styles.detailLabel}>Comments</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <MaterialIcons name="share" size={20} color="#2196F3" />
                      <Text style={styles.detailNumber}>{section.stats.shares.toLocaleString()}</Text>
                      <Text style={styles.detailLabel}>Shares</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <MaterialIcons name="visibility" size={20} color="#FF9800" />
                      <Text style={styles.detailNumber}>{section.stats.views.toLocaleString()}</Text>
                      <Text style={styles.detailLabel}>Views</Text>
                    </View>
                  </View>
                  
                  <View style={styles.totalPostsRow}>
                    <Text style={styles.totalPostsText}>Total Posts: {section.stats.total}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={loadUserData}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  grandTotalCard: {
    backgroundColor: theme.colors.background.secondary,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grandTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  grandTotalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF0000',
    marginLeft: 12,
  },
  grandTotalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  grandTotalStat: {
    alignItems: 'center',
  },
  grandTotalNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 4,
    marginBottom: 2,
  },
  grandTotalLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  grandTotalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  grandTotalContent: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  grandTotalViews: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  sectionsContainer: {
    margin: 16,
  },
  sectionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCount: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginRight: 8,
    fontWeight: '500',
  },
  sectionDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 4,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  totalPostsRow: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  totalPostsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF0000',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// Earnings feature removed - system purged
export default function EarningsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/reels'); // Redirect to reels instead
  }, [router]);
  return null;
}

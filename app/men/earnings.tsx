import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// Earnings feature removed - redirect to profile
export default function EarningsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/profile');
  }, [router]);
  return null;
}

import { Link } from 'expo-router';
import { useColorScheme } from 'react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function HomeScreen() {
  const linkColor = useColorScheme() === 'dark' ? '#93C5FD' : '#1D4ED8';
  return (
    <PlaceholderScreen title="Home" description="Your overview will appear here.">
      <Link href="/sign-in" accessibilityLabel="View sign-in screen placeholder" style={{ color: linkColor }}>
        View sign-in screen placeholder
      </Link>
    </PlaceholderScreen>
  );
}

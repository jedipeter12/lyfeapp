import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

function tabIcon(label: string) {
  return ({ color }: { color: ColorValue | null }) => (
    <Text style={{ color: color ?? undefined, fontSize: 20, fontWeight: '700' }}>{label}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('H') }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: tabIcon('T') }} />
      <Tabs.Screen name="pets" options={{ title: 'Pets', tabBarIcon: tabIcon('P') }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Vehicles', tabBarIcon: tabIcon('V') }} />
    </Tabs>
  );
}

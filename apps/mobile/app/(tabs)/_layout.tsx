import { Tabs } from "expo-router";
import { AppTabBar } from "../../components/AppTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Início" }} />
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="create" options={{ title: "Nova ocorrência" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notificações" }} />
      <Tabs.Screen name="account" options={{ title: "Minha conta" }} />
    </Tabs>
  );
}

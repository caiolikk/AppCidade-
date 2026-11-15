import { Tabs } from "expo-router";
import { AppTabBar } from "../../components/AppTabBar";

/**
 * D-023: o mapa é a tela inicial — ele é a rota `index` (`/`), então o app abre nele sem
 * redirect. A lista "perto de você" é `/nearby`. A ordem dos botões segue a navbar do Figma
 * (casa, mapa, nova, notificações, conta); `backBehavior="history"` faz o "voltar" do Android
 * refazer o caminho do usuário em vez de pular para o primeiro botão.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      backBehavior="history"
    >
      <Tabs.Screen name="nearby" options={{ title: "Perto de você" }} />
      <Tabs.Screen name="index" options={{ title: "Mapa" }} />
      <Tabs.Screen name="create" options={{ title: "Nova ocorrência" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notificações" }} />
      <Tabs.Screen name="account" options={{ title: "Minha conta" }} />
    </Tabs>
  );
}

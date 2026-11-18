import { Tabs } from "expo-router";
import { AppTabBar } from "../../components/AppTabBar";

/**
 * D-023/D-030: o mapa é a tela inicial — rota `index` (`/`), 1º botão, com o ícone de casa.
 * A lista "perto de você" (`/nearby`) é o 2º botão, com ícone próprio (`nav-nearby.svg`).
 * `backBehavior="history"` faz o "voltar" do Android refazer o caminho do usuário em vez de
 * pular para o primeiro botão.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      backBehavior="history"
    >
      <Tabs.Screen name="index" options={{ title: "Mapa" }} />
      <Tabs.Screen name="nearby" options={{ title: "Perto de você" }} />
      <Tabs.Screen name="create" options={{ title: "Nova ocorrência" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notificações" }} />
      <Tabs.Screen name="account" options={{ title: "Minha conta" }} />
    </Tabs>
  );
}

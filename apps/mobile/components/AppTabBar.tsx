import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import type { FC } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import NavHome from "../assets/figma/nav-home.svg";
import NavNearby from "../assets/figma/nav-nearby.svg";
import NavNotify from "../assets/figma/nav-notify.svg";
import NavProfile from "../assets/figma/nav-profile.svg";
import NavReport from "../assets/figma/nav-report.svg";
import { colors } from "../theme";

/**
 * Chave = nome da rota em `app/(tabs)`. O mapa é a rota `index`: tela inicial e 1º botão,
 * com o ícone de casa (D-023/D-030). "Perto de você" tem ícone próprio (não há no Figma).
 */
const ICONS: Record<string, { Icon: FC<SvgProps>; label: string }> = {
  index: { Icon: NavHome, label: "Início: mapa de ocorrências" },
  nearby: { Icon: NavNearby, label: "Ocorrências perto de você" },
  create: { Icon: NavReport, label: "Nova ocorrência" },
  notifications: { Icon: NavNotify, label: "Notificações" },
  account: { Icon: NavProfile, label: "Minha conta" },
};

/** Ícones de 60×60 do Figma (o desenho tem ~24px; o resto é área de toque). */
const ICON_SIZE = 60;
const BAR_PADDING_TOP = 8;

/** Espaço ocupado pela navbar flutuante: as telas usam isso como padding inferior. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return ICON_SIZE + BAR_PADDING_TOP + Math.max(insets.bottom, 12);
}

/**
 * Figma: "NAVBAR" — fundo de vidro (blur + rgba(217,217,217,.2)) flutuando sobre o conteúdo,
 * com uma barra interna de 300×60 e 5 ícones de traço. O Figma não desenha estado ativo;
 * por usabilidade, os ícones inativos ficam com 55% de opacidade e o ativo ganha um ponto
 * verde embaixo (a seção atual fica evidente entre mapa e "perto de você").
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFill, styles.webGlass]} />
      ) : (
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />

      <View style={styles.bar}>
        <View style={styles.barGlass} />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const entry = ICONS[route.name];
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={entry?.label ?? route.name}
              accessibilityState={{ selected: focused }}
              style={({ pressed }) => [
                styles.item,
                !focused && styles.inactive,
                pressed && styles.pressed,
              ]}
            >
              {entry ? <entry.Icon width={ICON_SIZE} height={ICON_SIZE} /> : null}
              {focused ? <View style={styles.activeDot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: BAR_PADDING_TOP,
    alignItems: "center",
    overflow: "hidden",
  },
  webGlass: {
    backgroundColor: "rgba(250,250,250,0.85)",
  },
  tint: {
    backgroundColor: "rgba(217,217,217,0.2)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  barGlass: {
    position: "absolute",
    left: 1,
    right: 1,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(217,217,217,0.2)",
    opacity: 0.5,
  },
  item: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  inactive: {
    opacity: 0.55,
  },
  activeDot: {
    position: "absolute",
    bottom: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.35,
  },
});

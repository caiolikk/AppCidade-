import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";

const ICONS: Record<
  string,
  { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }
> = {
  index: { on: "home", off: "home-outline" },
  map: { on: "map", off: "map-outline" },
  create: { on: "add", off: "add" },
  notifications: { on: "notifications", off: "notifications-outline" },
  account: { on: "person", off: "person-outline" },
};

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
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

        const iconConfig = ICONS[route.name] ?? { on: "ellipse", off: "ellipse-outline" };
        const iconName = focused ? iconConfig.on : iconConfig.off;
        const isCreate = route.name === "create";

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={route.name}
            style={styles.item}
          >
            <Ionicons
              name={iconName}
              size={isCreate ? 30 : 25}
              color={focused ? theme.colors.text.primary : "#374151"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: theme.colors.background.tabBar, // #EDF6EE
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
});

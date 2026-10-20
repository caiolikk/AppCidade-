import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusDot } from "../../components/StatusDot";
import { useOccurrences } from "../../hooks/use-feed";
import { toCardModel } from "../../lib/format";
import { CATEGORY_PASTEL_BG, theme } from "../../theme";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Infraestrutura: "construct",
  Limpeza: "trash",
  Segurança: "shield-checkmark",
  Trânsito: "car",
  Outros: "ellipsis-horizontal",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const occurrencesQuery = useOccurrences();

  const cards = useMemo(() => {
    return (occurrencesQuery.data ?? []).map(toCardModel);
  }, [occurrencesQuery.data]);

  // Divide em novas (primeiras 4) e antigas (restantes)
  const novas = useMemo(() => cards.slice(0, 4), [cards]);
  const antigas = useMemo(() => cards.slice(4), [cards]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>Novas</Text>
        {novas.length > 0 ? (
          novas.map((item) => (
            <NotificationItem
              key={item.id}
              occurrence={item}
              onPress={() => router.push(`/occurrence/${item.id}`)}
            />
          ))
        ) : (
          <Text style={styles.emptyNote}>Nenhuma nova notificação.</Text>
        )}

        <Text style={[styles.sectionHeader, styles.sectionAntigas]}>Antigas</Text>
        {antigas.length > 0 ? (
          antigas.map((item) => (
            <NotificationItem
              key={item.id}
              occurrence={item}
              onPress={() => router.push(`/occurrence/${item.id}`)}
            />
          ))
        ) : (
          <Text style={styles.emptyNote}>Sem notificações anteriores.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationItem({
  occurrence,
  onPress,
}: {
  occurrence: ReturnType<typeof toCardModel>;
  onPress: () => void;
}) {
  const pastelBg = CATEGORY_PASTEL_BG[occurrence.category] ?? "#F3F4F6";
  const iconName = CATEGORY_ICONS[occurrence.category] ?? "notifications-outline";

  return (
    <Pressable style={styles.itemRow} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: pastelBg }]}>
        <Ionicons name={iconName} size={20} color={theme.colors.text.primary} />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {occurrence.title}
        </Text>
        <Text style={styles.itemSubtitle}>
          {occurrence.category} • há {occurrence.reportedAgo}
        </Text>
      </View>

      <View style={styles.dotBox}>
        <StatusDot status={occurrence.status} size={10} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 22,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionAntigas: {
    marginTop: 20,
  },
  emptyNote: {
    fontSize: 12,
    color: theme.colors.text.muted,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBox: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weight.semiBold,
    color: theme.colors.text.primary,
  },
  itemSubtitle: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  dotBox: {
    paddingLeft: 4,
  },
});

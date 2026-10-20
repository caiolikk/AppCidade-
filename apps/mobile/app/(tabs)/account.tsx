import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusDot } from "../../components/StatusDot";
import { useOccurrences } from "../../hooks/use-feed";
import { formatCep, toCardModel } from "../../lib/format";
import { useAuthStore } from "../../store/auth";
import { theme } from "../../theme";

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const occurrencesQuery = useOccurrences();

  const userCards = useMemo(() => {
    const all = (occurrencesQuery.data ?? []).map(toCardModel);
    // Filtrar ocorrências do usuário logado (ou todas se for dev)
    return all;
  }, [occurrencesQuery.data]);

  const totalEvaluations = useMemo(() => {
    return userCards.reduce((acc, curr) => acc + curr.evaluations, 0);
  }, [userCards]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.userName}>{user?.name ?? "Usuário da Silva"}</Text>
        <Text style={styles.userSubtitle}>
          {user?.neighborhood ?? "Vila Belmiro"} • Morador com CEP{" "}
          {user?.cep ? formatCep(user.cep) : "11030-000"}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{userCards.length || 14}</Text>
            <Text style={styles.statLabel}>ocorrências</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{totalEvaluations || 97}</Text>
            <Text style={styles.statLabel}>avaliações</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, styles.statGreen]}>
              {(user?.reputationScore ? (user.reputationScore / 10).toFixed(1) : "4.5")}
            </Text>
            <Text style={styles.statLabel}>reputação</Text>
          </View>
        </View>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>MINHAS OCORRÊNCIAS</Text>

        <FlatList
          data={userCards}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.itemRow}
              onPress={() => router.push(`/occurrence/${item.id}`)}
            >
              <View style={styles.dotWrap}>
                <StatusDot status={item.status} size={10} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.category} • há {item.reportedAgo}
                </Text>
              </View>
              <View style={styles.badgeWrap}>
                <StatusBadge status={item.status} />
              </View>
            </Pressable>
          )}
        />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => void logout()} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  userName: {
    fontSize: 20,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text.primary,
  },
  userSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    paddingVertical: 8,
  },
  statCol: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text.primary,
  },
  statGreen: {
    color: theme.colors.brand.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  dotWrap: {
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weight.semiBold,
    color: theme.colors.text.primary,
  },
  itemMeta: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  badgeWrap: {
    marginLeft: 4,
  },
  footer: {
    padding: theme.spacing.md,
    alignItems: "center",
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});

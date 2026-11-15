import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabBarSpace } from "../../components/AppTabBar";
import { OccurrenceDetailsModal } from "../../components/OccurrenceDetailsModal";
import { OccurrenceListRow } from "../../components/OccurrenceListRow";
import { UserAvatar } from "../../components/UserAvatar";
import { PROFILE_RECENT_LIMIT, useMoreMyOccurrences, useMyProfile } from "../../hooks/use-profile";
import { formatMemberSince } from "../../lib/format";
import type { MyProfile } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { colors, type } from "../../theme";

/**
 * Figma "Frame - Minha Conta" (1:3343): avatar 90, nome, "Membro desde", 3 indicadores e
 * "MINHAS OCORRÊNCIAS". Tudo vem de `GET /me/profile` (dados reais do usuário do token,
 * D-025). A reputação segue a regra provisória do backend (D-024). A engrenagem (não
 * desenhada no Figma) leva às configurações.
 */
export default function AccountScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const storedUser = useAuthStore((state) => state.user);
  const profileQuery = useMyProfile();
  const [showMore, setShowMore] = useState(false);
  const moreQuery = useMoreMyOccurrences(showMore);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // Atualiza ao voltar para a aba (ex.: depois de criar ou avaliar uma ocorrência).
  useFocusEffect(
    useCallback(() => {
      void profileQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const profile = profileQuery.data;
  // Antes do perfil chegar, nome/foto vêm do usuário da sessão (também da API, via /me).
  const user = profile?.user ?? storedUser;

  const occurrences = useMemo(() => {
    const extra = moreQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return [...(profile?.recentOccurrences ?? []), ...(showMore ? extra : [])];
  }, [moreQuery.data, profile?.recentOccurrences, showMore]);

  const total = profile?.stats.occurrences ?? 0;
  const remaining = Math.max(0, total - occurrences.length);
  const staleError = profileQuery.isError && Boolean(profile);

  function loadMore() {
    if (!showMore) {
      setShowMore(true);
    } else if (moreQuery.hasNextPage && !moreQuery.isFetchingNextPage) {
      void moreQuery.fetchNextPage();
    }
  }

  const header = (
    <View>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Configurações do perfil"
          style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <UserAvatar uri={user?.avatarUrl} size={90} />
        <Text style={styles.name} numberOfLines={2}>
          {user?.name ?? " "}
        </Text>
        {user?.createdAt ? (
          <Text style={styles.since}>Membro desde {formatMemberSince(user.createdAt)}</Text>
        ) : null}
        {user?.neighborhood ? (
          <Text style={styles.place}>{user.neighborhood}, Santos</Text>
        ) : null}
      </View>

      <Stats profile={profile} loading={profileQuery.isLoading} />

      {staleError ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Não foi possível atualizar. Mostrando os dados carregados às{" "}
            {new Date(profileQuery.dataUpdatedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </Text>
          <Pressable onPress={() => void profileQuery.refetch()} hitSlop={8}>
            <Text style={styles.link}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.section}>MINHAS OCORRÊNCIAS</Text>
    </View>
  );

  let empty: ReactElement;
  if (profileQuery.isLoading) {
    empty = <ActivityIndicator style={styles.loader} color={colors.primary} />;
  } else if (profileQuery.isError) {
    empty = (
      <View style={styles.state}>
        <Text style={styles.stateText}>Não foi possível carregar o seu perfil.</Text>
        <Pressable onPress={() => void profileQuery.refetch()} hitSlop={8}>
          <Text style={styles.link}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  } else {
    empty = (
      <View style={styles.state}>
        <Text style={styles.stateText}>
          Você ainda não registrou nenhuma ocorrência. Quando registrar, ela aparece aqui com o
          status atualizado.
        </Text>
        <Pressable onPress={() => router.push("/create")} hitSlop={8}>
          <Text style={styles.link}>Registrar uma ocorrência</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={occurrences}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) => <OccurrenceListRow occurrence={item} onPress={() => setDetailsId(item.id)} />}
        ListFooterComponent={
          remaining > 0 && total > PROFILE_RECENT_LIMIT ? (
            <Pressable
              onPress={loadMore}
              disabled={moreQuery.isFetching}
              hitSlop={8}
              style={styles.more}
              accessibilityRole="button"
            >
              {moreQuery.isFetching ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.link}>
                  {moreQuery.isError ? "Erro ao carregar. Tentar de novo" : `Ver mais (${remaining})`}
                </Text>
              )}
            </Pressable>
          ) : null
        }
        contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching && !profileQuery.isLoading}
            onRefresh={() => void profileQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <OccurrenceDetailsModal
        occurrenceId={detailsId}
        onClose={() => setDetailsId(null)}
        onShowOnMap={(id) => {
          setDetailsId(null);
          router.push({ pathname: "/", params: { focus: id, focusKey: String(Date.now()) } });
        }}
      />
    </SafeAreaView>
  );
}

/** Figma: 3 colunas — número 18 bold + rótulo 12 semibold; reputação em verde. */
function Stats({ profile, loading }: { profile: MyProfile | undefined; loading: boolean }) {
  const stats = profile?.stats;
  const score = stats?.reputation.score;
  return (
    <View style={styles.stats}>
      <Stat label="Ocorrências" value={stats ? String(stats.occurrences) : null} loading={loading} />
      <Stat label="Avaliações" value={stats ? String(stats.evaluationsGiven) : null} loading={loading} />
      <Stat
        label="Reputação"
        value={stats ? (score === null || score === undefined ? null : score.toFixed(1)) : null}
        emptyText={stats ? "Sem avaliações" : undefined}
        highlight
        loading={loading}
        accessibilityHint={
          stats && score !== null && score !== undefined
            ? `${score.toFixed(1)} de ${stats.reputation.scale}, com base em ${stats.reputation.received} avaliações recebidas`
            : undefined
        }
      />
    </View>
  );
}

function Stat({
  label,
  value,
  emptyText,
  highlight,
  loading,
  accessibilityHint,
}: {
  label: string;
  value: string | null;
  emptyText?: string;
  highlight?: boolean;
  loading: boolean;
  accessibilityHint?: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value ?? emptyText ?? "carregando"}`} accessibilityHint={accessibilityHint}>
      <View style={styles.statValueBox}>
        {value !== null ? (
          <Text style={[styles.statValue, highlight && styles.statHighlight]}>{value}</Text>
        ) : emptyText ? (
          <Text style={styles.statEmpty}>{emptyText}</Text>
        ) : loading ? (
          <View style={styles.statSkeleton} />
        ) : (
          <Text style={styles.statValue}>–</Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 11,
  },
  topBar: {
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 15,
  },
  gear: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  identity: {
    alignItems: "center",
    marginTop: 12,
  },
  name: {
    ...type.title,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 24,
  },
  since: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 17,
    marginTop: 4,
  },
  place: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 14,
  },
  stat: {
    minWidth: 76,
    alignItems: "center",
  },
  statValueBox: {
    height: 22,
    justifyContent: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  statHighlight: {
    color: colors.primary,
  },
  statEmpty: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
  },
  statSkeleton: {
    width: 24,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.divider,
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  notice: {
    marginTop: 16,
    marginHorizontal: 4,
    gap: 4,
  },
  noticeText: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 15,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 40,
    marginLeft: 4,
    marginBottom: 5,
  },
  loader: {
    marginTop: 24,
  },
  state: {
    paddingHorizontal: 4,
    paddingTop: 12,
    gap: 8,
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 17,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  more: {
    alignItems: "center",
    paddingVertical: 16,
  },
});

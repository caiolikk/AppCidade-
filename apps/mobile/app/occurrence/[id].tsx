import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBadge } from "../../components/StatusBadge";
import { useOccurrence } from "../../hooks/use-feed";
import { api, ApiError } from "../../lib/api";
import { EVALUATION_LABEL } from "../../lib/format";
import type { EvaluationType } from "../../lib/types";
import { theme } from "../../theme";

const VOTE_TYPES: EvaluationType[] = ["UTIL", "PERSISTE", "INCORRETA"];

export default function OccurrenceDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOccurrence(id ?? "");
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voting, setVoting] = useState<EvaluationType | null>(null);

  const occurrence = query.data;

  async function vote(type: EvaluationType) {
    if (!id) return;
    setVoteError(null);
    setVoting(type);
    try {
      await api(`/occurrences/${id}/evaluations`, { body: { type } });
      await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (caught) {
      setVoteError(
        caught instanceof ApiError ? caught.message : "Não foi possível registrar o voto.",
      );
    } finally {
      setVoting(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.topTitle}>Detalhes da Ocorrência</Text>
      </View>

      {query.isLoading || !occurrence ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.brand.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {occurrence.thumbnailUrl ? (
            <Image
              source={{ uri: occurrence.thumbnailUrl }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.badgeRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{occurrence.category.name}</Text>
            </View>
            <StatusBadge status={occurrence.status} />
          </View>

          <Text style={styles.title}>{occurrence.title}</Text>

          {occurrence.description ? (
            <Text style={styles.description}>{occurrence.description}</Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Avaliação da comunidade</Text>
          <Text style={styles.sectionHint}>
            Ajude a validar esta ocorrência para a gestão do município:
          </Text>

          <View style={styles.votes}>
            {VOTE_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => void vote(type)}
                disabled={voting !== null}
                style={styles.vote}
              >
                <Text style={styles.voteLabel}>{EVALUATION_LABEL[type]}</Text>
                <Text style={styles.voteCount}>{occurrence.votes[type]}</Text>
              </Pressable>
            ))}
          </View>

          {voteError ? <Text style={styles.error}>{voteError}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.subtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: theme.colors.text.primary,
    fontSize: 17,
    fontWeight: theme.typography.weight.bold,
  },
  loader: {
    marginTop: 60,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
    paddingBottom: 40,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: theme.typography.weight.semiBold,
    color: theme.colors.text.primary,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 22,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  description: {
    color: theme.colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.subtle,
    marginVertical: 24,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text.primary,
  },
  sectionHint: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginBottom: 12,
  },
  votes: {
    flexDirection: "row",
    gap: 8,
  },
  vote: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    backgroundColor: theme.colors.background.subtle,
  },
  voteLabel: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: theme.typography.weight.bold,
    textAlign: "center",
  },
  voteCount: {
    color: theme.colors.brand.primary,
    marginTop: 4,
    fontSize: 15,
    fontWeight: theme.typography.weight.bold,
  },
  error: {
    color: theme.colors.text.error,
    marginTop: 12,
    fontSize: 13,
  },
});

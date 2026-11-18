import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useOccurrence } from "../hooks/use-feed";
import { profileKey } from "../hooks/use-profile";
import { api, ApiError } from "../lib/api";
import { EVALUATION_LABEL, formatReportedAgo } from "../lib/format";
import { distanceKm, formatDistance, type LatLng } from "../lib/geo";
import type { EvaluationType, PublicOccurrence } from "../lib/types";
import { colors, statusVisual, statusVisualColors, type } from "../theme";
import { CategoryBadge } from "./CategoryBadge";
import { PrimaryButton } from "./PrimaryButton";
import { StatusPill } from "./StatusPill";

const VOTE_TYPES: EvaluationType[] = ["UTIL", "PERSISTE", "INCORRETA"];

type OccurrenceDetailsProps = {
  occurrence: PublicOccurrence;
  /** Posição do usuário para mostrar a distância (opcional). */
  userPosition?: LatLng | null;
  /** Mostra o botão "Ver no mapa". */
  onShowOnMap?: () => void;
  /** Antes de abrir a edição (o modal fecha para a tela de edição aparecer). */
  onLeave?: () => void;
  /** Depois de remover (fechar o modal ou voltar da rota). */
  onRemoved?: () => void;
};

/** Confirmação de ação destrutiva: `Alert` no app; `window.confirm` na web (o Alert não tem botões lá). */
function confirmRemoval(): Promise<boolean> {
  const title = "Remover ocorrência?";
  const message =
    "Ela sai do mapa e do seu perfil, e a foto é apagada. Essa ação não pode ser desfeita.";
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Remover", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Conteúdo de detalhes da ocorrência — o MESMO usado no modal (Home e mapa) e na rota
 * `/occurrence/[id]`. Usa só os dados do DTO público (sem campos inventados): a API expõe
 * uma única foto pública (`thumbnailUrl`); a original fica protegida (D-006/D-011).
 * Renderize com `key={occurrence.id}` para não herdar estado de outra ocorrência.
 */
export function OccurrenceDetails({
  occurrence,
  userPosition,
  onShowOnMap,
  onLeave,
  onRemoved,
}: OccurrenceDetailsProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // `viewer` (autor? pode editar?) vem do detalhe com login (D-032); o modal recebe a
  // ocorrência da lista pública, que não tem essa informação.
  const detailQuery = useOccurrence(occurrence.id);
  const viewer = occurrence.viewer ?? detailQuery.data?.viewer;
  const [removing, setRemoving] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voting, setVoting] = useState<EvaluationType | null>(null);
  const [voted, setVoted] = useState<EvaluationType | null>(null);

  const point = { latitude: Number(occurrence.latitude), longitude: Number(occurrence.longitude) };
  const distance = userPosition ? distanceKm(userPosition, point) : null;
  const tint = statusVisualColors[statusVisual[occurrence.status]].pill;

  async function vote(voteType: EvaluationType) {
    setVoteError(null);
    setVoting(voteType);
    try {
      await api(`/occurrences/${occurrence.id}/evaluations`, { body: { type: voteType } });
      setVoted(voteType);
      await queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    } catch (caught) {
      setVoteError(
        caught instanceof ApiError ? caught.message : "Não foi possível registrar o voto.",
      );
    } finally {
      setVoting(null);
    }
  }

  function openEdit() {
    onLeave?.();
    router.push({ pathname: "/occurrence/edit/[id]", params: { id: occurrence.id } });
  }

  async function remove() {
    if (removing || !(await confirmRemoval())) return;
    setAuthorError(null);
    setRemoving(true);
    try {
      await api(`/occurrences/${occurrence.id}`, { method: "DELETE" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
        queryClient.invalidateQueries({ queryKey: profileKey }),
      ]);
      onRemoved?.();
    } catch (caught) {
      setAuthorError(
        caught instanceof ApiError ? caught.message : "Não foi possível remover a ocorrência.",
      );
      // A situação pode ter mudado (ex.: o gestor assumiu): recarrega o `viewer`.
      void detailQuery.refetch();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <View>
      <View style={styles.header}>
        <CategoryBadge name={occurrence.category.name} size={44} shape="rounded" backgroundColor={tint} />
        <View style={styles.headerText}>
          <Text style={styles.category} numberOfLines={2}>
            {/* Ocorrências antigas e a categoria "Outros" não têm subcategoria (D-022). */}
            {occurrence.subcategory
              ? `${occurrence.category.name} · ${occurrence.subcategory.name}`
              : occurrence.category.name}
          </Text>
          <Text style={styles.ago}>há {formatReportedAgo(occurrence.createdAt)}</Text>
        </View>
        <StatusPill status={occurrence.status} />
      </View>

      <Text style={styles.title}>{occurrence.title}</Text>

      {occurrence.thumbnailUrl ? (
        <Image
          source={{ uri: occurrence.thumbnailUrl }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel="Foto da ocorrência"
        />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Text style={styles.noPhotoText}>Sem foto disponível</Text>
        </View>
      )}

      {occurrence.description ? (
        <>
          <Text style={styles.section}>Descrição</Text>
          <Text style={styles.body}>{occurrence.description}</Text>
        </>
      ) : null}

      <Text style={styles.section}>Localização</Text>
      <Text style={styles.body}>
        {distance !== null ? `A ${formatDistance(distance)} de você · ` : ""}
        {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
      </Text>
      <Text style={styles.meta}>Registrada em {formatDateTime(occurrence.createdAt)}</Text>

      {onShowOnMap ? (
        <PrimaryButton label="Ver no mapa" variant="secondary" onPress={onShowOnMap} style={styles.mapButton} />
      ) : null}

      <Text style={styles.section}>Avaliação da comunidade</Text>
      <View style={styles.votes}>
        {VOTE_TYPES.map((voteType) => {
          const chosen = voted === voteType;
          return (
            <Pressable
              key={voteType}
              onPress={() => void vote(voteType)}
              disabled={voting !== null || voted !== null}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              style={({ pressed }) => [styles.vote, chosen && styles.voteChosen, pressed && styles.pressed]}
            >
              <Text style={[styles.voteLabel, chosen && styles.voteLabelChosen]}>
                {EVALUATION_LABEL[voteType]}
              </Text>
              <Text style={[styles.voteCount, chosen && styles.voteLabelChosen]}>
                {occurrence.votes[voteType]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {voteError ? <Text style={styles.error}>{voteError}</Text> : null}

      {/* Só para o autor (D-032): editar/remover enquanto "em análise"; depois, só o aviso. */}
      {viewer?.isAuthor ? (
        <>
          <Text style={styles.section}>Sua ocorrência</Text>
          {viewer.canEdit ? (
            <>
              <PrimaryButton
                label="Editar ocorrência"
                variant="secondary"
                onPress={openEdit}
                disabled={removing}
              />
              <Pressable
                onPress={() => void remove()}
                disabled={removing}
                accessibilityRole="button"
                accessibilityLabel="Remover ocorrência"
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              >
                <Text style={styles.removeText}>
                  {removing ? "Removendo…" : "Remover ocorrência"}
                </Text>
              </Pressable>
              <Text style={styles.meta}>
                Você pode editar ou remover enquanto ela estiver em análise.
              </Text>
            </>
          ) : (
            <Text style={styles.body}>
              Esta ocorrência já está sendo tratada pela prefeitura e não pode mais ser editada
              nem removida.
            </Text>
          )}
          {authorError ? <Text style={styles.error}>{authorError}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR");
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} às ${time}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  category: {
    ...type.section,
  },
  ago: {
    ...type.small,
    color: colors.muted,
    marginTop: 2,
  },
  title: {
    ...type.title,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 12,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.5)",
    backgroundColor: colors.grid,
  },
  noPhoto: {
    aspectRatio: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: {
    color: colors.muted,
    fontSize: 14,
  },
  section: {
    ...type.section,
    marginTop: 20,
    marginBottom: 6,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  meta: {
    ...type.small,
    color: colors.muted,
    marginTop: 6,
  },
  mapButton: {
    marginTop: 14,
  },
  votes: {
    flexDirection: "row",
    gap: 8,
  },
  vote: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.background,
    paddingVertical: 10,
    alignItems: "center",
  },
  voteChosen: {
    backgroundColor: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  voteLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  voteLabelChosen: {
    color: colors.background,
  },
  voteCount: {
    color: colors.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  error: {
    color: colors.error,
    marginTop: 12,
  },
  remove: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  removeText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "700",
  },
});

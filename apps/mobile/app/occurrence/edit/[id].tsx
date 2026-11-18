import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "../../../components/BackButton";
import {
  OccurrenceForm,
  type OccurrenceFormInitial,
  type OccurrenceFormValues,
} from "../../../components/OccurrenceForm";
import { useOccurrence } from "../../../hooks/use-feed";
import { profileKey } from "../../../hooks/use-profile";
import { api, apiUploadImage } from "../../../lib/api";
import type { PublicOccurrence } from "../../../lib/types";
import { colors, type } from "../../../theme";

/**
 * Edição pelo autor (D-032), só enquanto "em análise". Mesmo formulário da criação, já
 * preenchido; envia só o que mudou (`PATCH /occurrences/:id`). A API é quem decide se ainda
 * pode editar: se o gestor tiver movido a ocorrência, a resposta 409 aparece no formulário.
 */
export default function EditOccurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const query = useOccurrence(id ?? "");
  const occurrence = query.data;

  async function submit(values: OccurrenceFormValues) {
    if (!occurrence) return;
    const changes = diff(occurrence, values);
    if (values.photo.changed) {
      const media = await apiUploadImage({
        uri: values.photo.uri,
        name: "ocorrencia.jpg",
        type: values.photo.type,
      });
      changes.media = [media];
    }
    if (Object.keys(changes).length > 0) {
      await api(`/occurrences/${occurrence.id}`, { method: "PATCH", body: changes });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
        queryClient.invalidateQueries({ queryKey: profileKey }),
      ]);
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const back = <BackButton />;

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!occurrence || !occurrence.viewer?.canEdit) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.top}>
          <Text style={styles.kicker}>Editar ocorrência</Text>
          {back}
        </View>
        <Text style={styles.missing}>
          {!occurrence
            ? "Ocorrência não encontrada."
            : occurrence.viewer?.isAuthor
              ? "Esta ocorrência já está sendo tratada pela prefeitura e não pode mais ser editada."
              : "Só quem registrou a ocorrência pode editá-la."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OccurrenceForm
        heading="Editar Ocorrência"
        headerAccessory={back}
        submitLabel="Salvar alterações"
        initial={toInitial(occurrence)}
        bottomSpace={insets.bottom}
        onSubmit={submit}
      />
    </SafeAreaView>
  );
}

function toInitial(occurrence: PublicOccurrence): OccurrenceFormInitial {
  return {
    title: occurrence.title,
    description: occurrence.description ?? "",
    categoryId: occurrence.category.id,
    subcategoryId: occurrence.subcategory?.id ?? null,
    coords: { latitude: Number(occurrence.latitude), longitude: Number(occurrence.longitude) },
    photoUri: occurrence.thumbnailUrl,
  };
}

/** Só os campos alterados (o local vai em par; a categoria leva a subcategoria junto). */
function diff(occurrence: PublicOccurrence, values: OccurrenceFormValues) {
  const initial = toInitial(occurrence);
  const changes: Record<string, unknown> = {};
  if (values.title !== initial.title) changes.title = values.title;
  if (values.description !== initial.description) changes.description = values.description;
  if (values.categoryId !== initial.categoryId || values.subcategoryId !== initial.subcategoryId) {
    changes.categoryId = values.categoryId;
    changes.subcategoryId = values.subcategoryId;
  }
  if (
    values.coords.latitude !== initial.coords.latitude ||
    values.coords.longitude !== initial.coords.longitude
  ) {
    changes.latitude = values.coords.latitude;
    changes.longitude = values.coords.longitude;
  }
  return changes;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 12,
  },
  kicker: {
    ...type.subtitleMedium,
  },
  loader: {
    marginTop: 40,
  },
  missing: {
    color: colors.muted,
    paddingHorizontal: 26,
    paddingTop: 20,
  },
});

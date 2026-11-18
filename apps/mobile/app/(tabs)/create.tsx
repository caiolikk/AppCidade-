import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabBarSpace } from "../../components/AppTabBar";
import { OccurrenceForm, type OccurrenceFormValues } from "../../components/OccurrenceForm";
import { SuccessPopup } from "../../components/SuccessPopup";
import { profileKey } from "../../hooks/use-profile";
import { api, apiUploadImage } from "../../lib/api";
import { colors } from "../../theme";

/**
 * Figma "Frame - Nova Ocorrência" (107:1468 / 158:*). O formulário fica em
 * `components/OccurrenceForm` (o mesmo da edição, D-032); aqui: GPS ao abrir, upload da foto,
 * `POST /occurrences` e o popup de sucesso.
 */
export default function CreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tabBarSpace = useTabBarSpace();
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Trocar a key remonta o formulário vazio depois de enviar.
  const [formKey, setFormKey] = useState(0);

  async function submit(values: OccurrenceFormValues) {
    const media = await apiUploadImage({
      uri: values.photo.uri,
      name: "ocorrencia.jpg",
      type: values.photo.type,
    });

    const created = await api<{ id: string }>("/occurrences", {
      body: {
        title: values.title,
        description: values.description,
        latitude: values.coords.latitude,
        longitude: values.coords.longitude,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId ?? undefined,
        media: [media],
      },
    });

    // Recarrega feed, mapa e perfil a partir da API (fonte da verdade); nada só no cache.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
      queryClient.invalidateQueries({ queryKey: profileKey }),
    ]);
    setFormKey((value) => value + 1);
    setCreatedId(created.id); // abre o popup; ao fechar, vai para o mapa
  }

  const closeSuccess = useCallback(() => {
    const id = createdId;
    setCreatedId(null);
    if (id) {
      router.replace({ pathname: "/", params: { focus: id, focusKey: String(Date.now()) } });
    }
  }, [createdId, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OccurrenceForm
        key={formKey}
        heading="Nova Ocorrência"
        submitLabel="Enviar Ocorrência"
        autoLocate
        bottomSpace={tabBarSpace}
        onSubmit={submit}
      />

      <SuccessPopup
        visible={createdId !== null}
        title="Ocorrência Enviada!"
        message="Cheque o painel de ocorrências e fique atento às notificações para atualizações."
        onClose={closeSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

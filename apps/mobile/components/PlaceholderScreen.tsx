import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, type } from "../theme";

/**
 * Cabeçalho no padrão do Figma (Large Title à esquerda) para telas cuja funcionalidade
 * ainda não existe (ex.: Notificações). Mostra um estado vazio honesto, sem dados fictícios.
 */
export function PlaceholderScreen({ title, message }: { title: string; message?: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{message ?? "Em desenvolvimento."}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 36,
    paddingHorizontal: 26,
  },
  title: {
    ...type.largeTitle,
  },
  text: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 12,
  },
});

import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/PrimaryButton";
import { formatCep, ROLE_LABEL } from "../../lib/format";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../theme";

export default function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Minha conta</Text>
      <Text style={styles.subtitle}>{user?.name ?? "Cidadão"}</Text>

      <View style={styles.card}>
        <Row label="Bairro" value={user?.neighborhood ?? "—"} />
        <Row label="CEP" value={user?.cep ? formatCep(user.cep) : "—"} />
        <Row label="E-mail" value={user?.email ?? "—"} />
        <Row label="Perfil" value={user ? ROLE_LABEL[user.role] : "—"} />
      </View>

      <PrimaryButton label="Sair" onPress={() => void logout()} />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 2,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});

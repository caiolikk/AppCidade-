import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTabBarSpace } from "../../components/AppTabBar";
import { PrimaryButton } from "../../components/PrimaryButton";
import { formatCep, formatMemberSince, ROLE_LABEL } from "../../lib/format";
import { useAuthStore } from "../../store/auth";
import { colors, type } from "../../theme";

/**
 * Figma "Frame - Minha Conta" (1:3343): avatar, nome, "Membro desde". As estatísticas e a
 * lista "Minhas ocorrências" do Figma dependem de endpoints que a API ainda não tem
 * (ver plans/interface-figma.md) — não são exibidos dados inventados.
 */
export default function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const tabBarSpace = useTabBarSpace();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + 16 }]}>
        {/* Figma: o avatar (ICON - USER) está com opacidade 0; fica só o espaço acima do nome. */}
        <View style={styles.profile}>
          <Text style={styles.name}>{user?.name ?? "Cidadão"}</Text>
          {user?.createdAt ? (
            <Text style={styles.since}>Membro desde {formatMemberSince(user.createdAt)}</Text>
          ) : null}
        </View>

        <Text style={styles.section}>MEUS DADOS</Text>
        <View>
          <Row label="Bairro" value={user?.neighborhood ?? "—"} />
          <Row label="CEP" value={user?.cep ? formatCep(user.cep) : "—"} />
          <Row label="E-mail" value={user?.email ?? "—"} />
          <Row label="Perfil" value={user ? ROLE_LABEL[user.role] : "—"} />
        </View>

        <PrimaryButton
          label="Sair"
          variant="secondary"
          onPress={() => void logout()}
          style={styles.logout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Figma: linha de lista com divisória #D9D9D9 e padding 15. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 150,
    paddingHorizontal: 11,
  },
  profile: {
    alignItems: "center",
    marginBottom: 40,
  },
  name: {
    ...type.title,
    textAlign: "center",
  },
  since: {
    color: colors.text,
    fontSize: 14,
    marginTop: 6,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  value: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
  },
  logout: {
    marginTop: 32,
    marginHorizontal: 23,
  },
});

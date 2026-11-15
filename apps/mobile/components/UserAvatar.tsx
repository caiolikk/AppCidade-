import { Image, StyleSheet, View } from "react-native";
import IconUser from "../assets/figma/icon-user.svg";

type UserAvatarProps = {
  /** Foto (URL da API ou prévia local); sem foto, mostra o "ICON - USER" do Figma. */
  uri: string | null | undefined;
  size: number;
};

/**
 * Figma "Minha Conta": slot "ICON - USER" (90×90) — círculo claro com sombra. Com foto, a
 * imagem preenche o mesmo círculo.
 */
export function UserAvatar({ uri, size }: UserAvatarProps) {
  return (
    <View
      style={[styles.shadow, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="image"
      accessibilityLabel={uri ? "Foto de perfil" : "Sem foto de perfil"}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <IconUser width={size} height={size} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma: drop shadow 0/4, blur 4, #333 a 25% (o filtro do SVG vira sombra nativa).
  shadow: {
    backgroundColor: "#FAFAFA",
    shadowColor: "#333333",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

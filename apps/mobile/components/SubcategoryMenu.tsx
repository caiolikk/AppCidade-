import { BlurView } from "expo-blur";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { Subcategory } from "../lib/types";
import { colors } from "../theme";

/** Retângulo do ícone da categoria na janela (de `measureInWindow`). */
export type MenuAnchor = { x: number; y: number; width: number; height: number };

type SubcategoryMenuProps = {
  visible: boolean;
  categoryName: string;
  subcategories: Subcategory[];
  selectedId: string | null;
  anchor: MenuAnchor | null;
  onSelect: (subcategory: Subcategory) => void;
  onClose: () => void;
};

const MARGIN = 16;
const MAX_WIDTH = 270;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 34;

/** Figma: o "Outros" fecha a lista com reticências. */
export function subcategoryLabel(name: string) {
  return name === "Outros" ? "Outros…" : name;
}

/**
 * Figma "Nova Ocorrência" → menu da categoria: cartão de vidro claro sobre a tela esmaecida,
 * ancorado no ícone tocado, com o nome da categoria no topo e cada opção como título +
 * descrição. Tocar fora fecha sem escolher.
 */
export function SubcategoryMenu({
  visible,
  categoryName,
  subcategories,
  selectedId,
  anchor,
  onSelect,
  onClose,
}: SubcategoryMenuProps) {
  const window = useWindowDimensions();
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  const width = Math.min(MAX_WIDTH, window.width - MARGIN * 2);
  const height = cardHeight ?? HEADER_HEIGHT + subcategories.length * ROW_HEIGHT + 12;
  const maxHeight = window.height - MARGIN * 2;

  // Como no Figma: começa a meio do ícone, um pouco à direita do centro dele. Sem âncora
  // (ou se não couber), centraliza / encosta na margem.
  let left = anchor ? anchor.x + anchor.width * 0.45 : (window.width - width) / 2;
  left = Math.max(MARGIN, Math.min(left, window.width - width - MARGIN));
  let top = anchor ? anchor.y + anchor.height * 0.5 : (window.height - height) / 2;
  if (top + height > window.height - MARGIN) {
    top = window.height - MARGIN - height;
  }
  top = Math.max(MARGIN, top);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar opções"
      />
      <View
        style={[styles.card, { top, left, width, maxHeight }]}
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        accessibilityViewIsModal
      >
        {Platform.OS !== "web" ? (
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, styles.glass]} />

        <Text style={styles.header} accessibilityRole="header">
          {categoryName}
        </Text>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {subcategories.map((item) => {
            const selected = item.id === selectedId;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  item.description ? `${item.name}. ${item.description}` : item.name
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={[styles.name, selected && styles.selected]} numberOfLines={1}>
                  {subcategoryLabel(item.name)}
                </Text>
                {item.description ? (
                  <Text style={styles.description} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // Figma: a tela inteira fica acinzentada por trás do menu.
    backgroundColor: "rgba(110,110,110,0.45)",
  },
  card: {
    position: "absolute",
    borderRadius: 26,
    overflow: "hidden",
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  glass: {
    backgroundColor:
      Platform.OS === "web" ? "rgba(246,246,246,0.97)" : "rgba(246,246,246,0.82)",
  },
  header: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
    paddingHorizontal: 21,
    paddingBottom: 6,
  },
  row: {
    minHeight: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 21,
    paddingVertical: 7,
  },
  pressed: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  name: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  selected: {
    color: colors.primary,
    fontWeight: "600",
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
  },
});

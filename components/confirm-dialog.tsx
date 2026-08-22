import { StyleSheet, View, Pressable, Modal } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

// Themed confirmation dialog. Replaces Alert.alert for confirms — Alert (and
// its button callbacks) is a no-op on React Native Web, so destructive
// confirmations silently did nothing there.
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const tintColor = useThemeColor({}, "tint");
  const confirmColor = destructive ? "#FF3B30" : tintColor;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, { borderColor }]}>
              <ThemedText>{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.buttonPrimary, { backgroundColor: confirmColor }]}
            >
              <ThemedText style={styles.buttonPrimaryText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "600",
  },
});

import React, { useState, useEffect } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useGames } from "@/hooks/use-storage";

interface PersonalNotesProps {
  gameId: string;
}

export function PersonalNotes({ gameId }: PersonalNotesProps) {
  const { games, updateGame } = useGames();
  const [noteText, setNoteText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const tintColor = useThemeColor({}, "tint");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");
  const textColor = useThemeColor({}, "text");

  const game = games.find((g) => g.id === gameId);

  useEffect(() => {
    if (game?.notes) {
      setNoteText(game.notes);
    }
  }, [game?.notes]);

  const handleSave = async () => {
    if (!game) return;
    
    setIsSaving(true);
    await updateGame(game.id, { notes: noteText });
    setIsEditing(false);
    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCancel = () => {
    setNoteText(game?.notes || "");
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.section, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Personal Notes
        </ThemedText>
        {!isEditing && (
          <Pressable
            onPress={() => {
              setIsEditing(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.editButton, { backgroundColor: tintColor }]}
          >
            <ThemedText style={styles.editButtonText}>
              {noteText ? "Edit" : "Add"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {isEditing ? (
        <>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputBackground,
                borderColor,
                color: textColor,
              },
            ]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Add your strategies, tips, best scores, or observations..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleCancel}
              style={[styles.button, styles.cancelButton, { borderColor }]}
            >
              <ThemedText style={[styles.buttonText, { color: tintColor }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.button, styles.saveButton, { backgroundColor: tintColor }]}
            >
              <ThemedText style={[styles.buttonText, { color: "#fff" }]}>
                {isSaving ? "Saving..." : "Save"}
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.notesDisplay}>
          {noteText ? (
            <ThemedText style={styles.notesText}>{noteText}</ThemedText>
          ) : (
            <ThemedText style={styles.emptyText}>
              No notes yet. Tap &quot;Add&quot; to save your strategies, tips, or observations about this
              game.
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  notesDisplay: {
    paddingVertical: 8,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.5,
    fontStyle: "italic",
  },
});

import { XStack } from "@/components/x-stack";
import { YStack } from "@/components/y-stack";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function Page() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" style={styles.container} gap={30}>
      {/* Main content */}
      <YStack alignItems="center" gap={10}>
        <Text style={styles.title}>E Commerce App</Text>
        <Text style={styles.subtitle}>This is the first page of your app.</Text>
      </YStack>

      {/* Horizontal buttons using XStack */}
      <XStack gap={20}>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#007BFF" }]}>
          <Text style={styles.buttonText}>Button 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#28A745" }]}>
          <Text style={styles.buttonText}>Button 2</Text>
        </TouchableOpacity>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 24,
    color: "#555",
    textAlign: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
});

import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, SPACING } from "../../src/theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../src/theme/typography";
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Input,
  ListScreenSkeleton,
  ScreenHeader,
} from "../../src/components/ui";
import { useAuthStore } from "../../src/store/auth-store";
import {
  deleteBuyerAddress,
  fetchBuyerAddresses,
  saveBuyerAddress,
  setDefaultBuyerAddress,
} from "../../src/services/buyer.service";

export default function BuyerAddressesScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const q = useQuery({
    queryKey: ["buyer", "addresses", user?.id],
    queryFn: () => fetchBuyerAddresses(user!.id),
    enabled: Boolean(user?.id),
  });

  const handleCreate = async () => {
    if (!user?.id) return;
    setErr(null);
    setBusy(true);
    try {
      await saveBuyerAddress(user.id, {
        addressType: "both",
        contactName,
        phone,
        companyName,
        gstin,
        addressLine1: line1,
        city,
        state: stateName,
        pincode,
        country: "IN",
        isDefault: (q.data?.length ?? 0) === 0,
      });
      qc.invalidateQueries({ queryKey: ["buyer", "addresses", user.id] });
      setOpen(false);
      setContactName("");
      setPhone("");
      setLine1("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save address.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Saved Addresses"
        subtitle="Billing & site delivery locations"
        rightSlot={
          <Pressable onPress={() => setOpen(true)}>
            <Ionicons name="add-circle" size={26} color={COLORS.primary} />
          </Pressable>
        }
      />

      {q.isLoading ? (
        <ListScreenSkeleton />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title="No saved addresses"
              description="Add a billing or project site delivery address for faster quotation acceptance."
              actionLabel="Add Address"
              onAction={() => setOpen(true)}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.top}>
                <Text style={TYPOGRAPHY.cardTitle}>{item.contact_name}</Text>
                {item.is_default ? <Badge label="Default" tone="primary" /> : null}
              </View>
              {item.company_name ? <Text style={TYPOGRAPHY.caption}>{item.company_name}</Text> : null}
              <Text style={TYPOGRAPHY.body}>
                {item.address_line1}, {item.city}, {item.state} - {item.pincode}
              </Text>
              <Text style={TYPOGRAPHY.caption}>Phone: {item.phone}</Text>
              <View style={styles.actions}>
                {!item.is_default ? (
                  <Button
                    title="Set Default"
                    variant="outline"
                    size="sm"
                    onPress={async () => {
                      await setDefaultBuyerAddress(item.id);
                      qc.invalidateQueries({ queryKey: ["buyer", "addresses", user?.id] });
                    }}
                  />
                ) : null}
                <Button
                  title="Delete"
                  variant="ghost"
                  size="sm"
                  onPress={async () => {
                    if (!user?.id) return;
                    await deleteBuyerAddress(user.id, item.id);
                    qc.invalidateQueries({ queryKey: ["buyer", "addresses", user.id] });
                  }}
                />
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Add Site / Billing Address"
        footer={<Button title="Save Address" fullWidth loading={busy} onPress={handleCreate} />}
      >
        {err ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{err}</Text>
          </View>
        ) : null}
        <Input label="Contact Name" required value={contactName} onChangeText={setContactName} />
        <Input label="Phone" required keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Company Name" value={companyName} onChangeText={setCompanyName} />
        <Input label="GSTIN (Optional)" autoCapitalize="characters" value={gstin} onChangeText={setGstin} />
        <Input label="Address Line 1" required value={line1} onChangeText={setLine1} />
        <Input label="City" required value={city} onChangeText={setCity} />
        <Input label="State" required value={stateName} onChangeText={setStateName} />
        <Input label="PIN Code" required keyboardType="number-pad" value={pincode} onChangeText={setPincode} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: { gap: 4 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: SPACING.xs, marginTop: 6 },
  errBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.sm, borderRadius: RADII.sm, marginBottom: SPACING.sm },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
});

import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { PRICE_TYPES, type PriceType } from "@stone/types";
import { CATALOG_UNITS, STOCK_STATUSES, type CatalogUnit, type StockStatus } from "@stone/validation";
import { COLORS, RADII, SPACING } from "../../theme/tokens";
import { FONTS, TYPOGRAPHY } from "../../theme/typography";
import { Button, Card, Input, ScreenHeader, SelectSheet } from "../ui";
import {
  PRICE_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  STONE_COLOUR_SUGGESTIONS,
  STONE_FINISH_SUGGESTIONS,
  STONE_MATERIAL_SUGGESTIONS,
  UNIT_LABELS,
} from "../../lib/domain-meta";
import {
  fetchActiveStoneCategories,
  saveSellerProduct,
  type SellerProfileRow,
} from "../../services/seller.service";
import type { PickedFileInput } from "../../lib/storage-upload";

export function SellerProductForm({
  seller,
  initialProduct,
}: {
  seller: SellerProfileRow;
  initialProduct?: {
    id: string;
    name: string;
    sku: string | null;
    category_id: string | null;
    material_type: string | null;
    colour: string | null;
    finish: string | null;
    stone_origin: string | null;
    thickness: number | null;
    length: number | null;
    width: number | null;
    price_type: PriceType;
    price: number | null;
    unit: CatalogUnit;
    minimum_order_quantity: number | null;
    stock_status: StockStatus;
    lead_time: number | null;
    description: string | null;
    images: Array<{ id: string; url: string }>;
  };
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const categoriesQ = useQuery({
    queryKey: ["seller", "categories"],
    queryFn: fetchActiveStoneCategories,
  });

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id ?? "");
  const [materialType, setMaterialType] = useState(initialProduct?.material_type ?? "Marble");
  const [colour, setColour] = useState(initialProduct?.colour ?? "White");
  const [finish, setFinish] = useState(initialProduct?.finish ?? "Polished");
  const [origin, setOrigin] = useState(initialProduct?.stone_origin ?? "");
  const [thickness, setThickness] = useState(initialProduct?.thickness ? String(initialProduct.thickness) : "18");
  const [length, setLength] = useState(initialProduct?.length ? String(initialProduct.length) : "");
  const [width, setWidth] = useState(initialProduct?.width ? String(initialProduct.width) : "");
  const [priceType, setPriceType] = useState<PriceType>(initialProduct?.price_type ?? "fixed");
  const [price, setPrice] = useState(initialProduct?.price ? String(initialProduct.price) : "");
  const [unit, setUnit] = useState<CatalogUnit>(initialProduct?.unit ?? "sq_ft");
  const [moq, setMoq] = useState(initialProduct?.minimum_order_quantity ? String(initialProduct.minimum_order_quantity) : "");
  const [stockStatus, setStockStatus] = useState<StockStatus>(initialProduct?.stock_status ?? "in_stock");
  const [leadTime, setLeadTime] = useState(initialProduct?.lead_time ? String(initialProduct.lead_time) : "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [pickedImages, setPickedImages] = useState<PickedFileInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () =>
      (categoriesQ.data ?? []).map((c) => ({
        label: c.name,
        value: c.id,
        subtitle: c.parent_id ? "Variety / Subcategory" : "Primary Stone Category",
      })),
    [categoriesQ.data],
  );

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!res.canceled) {
      setPickedImages((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          mimeType: a.mimeType || "image/jpeg",
          fileName: a.fileName || "stone.jpg",
          fileSize: a.fileSize ?? null,
        })),
      ]);
    }
  };

  const handleSave = async (intent: "draft" | "pending_review") => {
    setErr(null);
    setSaving(true);
    try {
      await saveSellerProduct({
        seller,
        productId: initialProduct?.id,
        input: {
          name,
          sku,
          categoryId: categoryId || undefined,
          subcategoryId: undefined,
          materialType,
          colour,
          finish,
          stoneOrigin: origin,
          thickness: thickness || null,
          length: length || null,
          width: width || null,
          priceType,
          price: priceType === "on_request" ? null : price,
          currency: "INR",
          unit,
          minimumOrderQuantity: moq || null,
          stockStatus,
          leadTime: leadTime || null,
          description,
          customSpecifications: [],
          intent,
        },
        newImages: pickedImages,
      });
      qc.invalidateQueries({ queryKey: ["seller", "products", seller.id] });
      qc.invalidateQueries({ queryKey: ["seller", "entitlements", seller.id] });
      qc.invalidateQueries({ queryKey: ["seller", "dashboard"] });
      router.back();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save stone listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScreenHeader
        title={initialProduct ? "Edit Stone Listing" : "Add Stone Listing"}
        subtitle={seller.business_name}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {err ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{err}</Text>
          </View>
        ) : null}

        <Card>
          <Text style={[TYPOGRAPHY.cardTitle, { marginBottom: SPACING.sm }]}>
            Stone Media
          </Text>
          <View style={styles.imgStrip}>
            {(initialProduct?.images ?? []).map((img) => (
              <Image key={img.id} source={{ uri: img.url }} style={styles.thumb} contentFit="cover" />
            ))}
            {pickedImages.map((img, i) => (
              <Image key={i} source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
            ))}
          </View>
          <Button
            title="Select Stone Photos"
            variant="outline"
            size="sm"
            onPress={pickImages}
            style={{ marginTop: SPACING.xs }}
          />
        </Card>

        <Card>
          <Input label="Product Name" required value={name} onChangeText={setName} placeholder="e.g. Makrana Pure White Marble Slabs" />
          <Input label="SKU / Lot Code" value={sku} onChangeText={setSku} placeholder="Optional internal SKU" />
          <SelectSheet label="Taxonomy Category" value={categoryId} options={categoryOptions} onSelect={setCategoryId} allowClear />
          <SelectSheet
            label="Material"
            value={materialType}
            options={STONE_MATERIAL_SUGGESTIONS.map((m) => ({ label: m, value: m }))}
            onSelect={setMaterialType}
          />
          <SelectSheet
            label="Colour"
            value={colour}
            options={STONE_COLOUR_SUGGESTIONS.map((c) => ({ label: c, value: c }))}
            onSelect={setColour}
          />
          <SelectSheet
            label="Surface Finish"
            value={finish}
            options={STONE_FINISH_SUGGESTIONS.map((f) => ({ label: f, value: f }))}
            onSelect={setFinish}
          />
          <Input label="Quarry Origin" value={origin} onChangeText={setOrigin} placeholder="e.g. Makrana, Rajasthan" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Thickness (mm)" keyboardType="numeric" value={thickness} onChangeText={setThickness} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Length (mm)" keyboardType="numeric" value={length} onChangeText={setLength} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Width (mm)" keyboardType="numeric" value={width} onChangeText={setWidth} />
            </View>
          </View>

          <SelectSheet
            label="Pricing Type"
            value={priceType}
            searchable={false}
            options={PRICE_TYPES.map((pt) => ({ label: PRICE_TYPE_LABELS[pt], value: pt }))}
            onSelect={(v) => setPriceType(v as PriceType)}
          />

          {priceType !== "on_request" ? (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input label="Commercial Price (INR)" required keyboardType="numeric" value={price} onChangeText={setPrice} />
              </View>
              <View style={{ flex: 1 }}>
                <SelectSheet
                  label="Unit"
                  searchable={false}
                  value={unit}
                  options={CATALOG_UNITS.map((u) => ({ label: UNIT_LABELS[u], value: u }))}
                  onSelect={(v) => setUnit(v as CatalogUnit)}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="MOQ" keyboardType="numeric" value={moq} onChangeText={setMoq} placeholder="e.g. 500" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Lead Time (Days)" keyboardType="numeric" value={leadTime} onChangeText={setLeadTime} placeholder="e.g. 10" />
            </View>
          </View>

          <SelectSheet
            label="Stock Availability"
            searchable={false}
            value={stockStatus}
            options={STOCK_STATUSES.map((s) => ({ label: STOCK_STATUS_LABELS[s], value: s }))}
            onSelect={(v) => setStockStatus(v as StockStatus)}
          />

          <Input
            label="Lot Description"
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Describe vein pattern, quarry block grade, calibration tolerances..."
          />

          <View style={styles.actions}>
            <Button
              title="Save Draft"
              variant="outline"
              loading={saving}
              onPress={() => handleSave("draft")}
              style={{ flex: 1 }}
            />
            <Button
              title="Submit for Review"
              loading={saving}
              onPress={() => handleSave("pending_review")}
              style={{ flex: 1.3 }}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  errBox: { backgroundColor: COLORS.errorSoft, padding: SPACING.sm, borderRadius: RADII.sm },
  errText: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.error },
  imgStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: RADII.sm, backgroundColor: COLORS.stoneBeige },
  row: { flexDirection: "row", gap: SPACING.xs },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
});

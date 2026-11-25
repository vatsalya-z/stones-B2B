import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BUTTON_HEIGHT, COLORS, RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";
import { BottomSheet } from "./BottomSheet";
import { Input } from "./Input";

export interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
}

export interface SelectSheetProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string | null | undefined;
  options: ReadonlyArray<SelectOption>;
  onSelect: (value: string) => void;
  error?: string | null;
  searchable?: boolean;
  allowClear?: boolean;
}

export function SelectSheet({
  label,
  required,
  placeholder = "Select an option",
  value,
  options,
  onSelect,
  error,
  searchable = true,
  allowClear = false,
}: SelectSheetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.value === value)?.label ?? value;
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.subtitle?.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        accessibilityRole="button"
        style={[styles.trigger, Boolean(error) && styles.triggerError]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,
            !selectedLabel && styles.placeholderText,
          ]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? "Select Option"}
      >
        {searchable && options.length > 6 ? (
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search options..."
            leftAdornment={<Ionicons name="search" size={18} color={COLORS.textSecondary} />}
          />
        ) : null}

        {allowClear && value ? (
          <Pressable
            onPress={() => {
              onSelect("");
              setOpen(false);
            }}
            style={styles.optionRow}
          >
            <Text style={styles.clearText}>Clear selection</Text>
          </Pressable>
        ) : null}

        {filtered.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              style={[styles.optionRow, isSelected && styles.optionSelected]}
            >
              <View style={styles.optionTextWrap}>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.subtitle ? (
                  <Text style={styles.optionSub}>{opt.subtitle}</Text>
                ) : null}
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
              ) : null}
            </Pressable>
          );
        })}

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No matching options found.</Text>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: COLORS.accent,
  },
  trigger: {
    minHeight: BUTTON_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
  },
  triggerError: {
    borderColor: COLORS.error,
  },
  triggerText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingRight: SPACING.xs,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  errorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  optionRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: "#E6F2ED",
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  optionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
  },
  optionSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  clearText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.error,
  },
  empty: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: SPACING.lg,
  },
});

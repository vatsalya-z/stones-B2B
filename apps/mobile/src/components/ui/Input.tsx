import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { BUTTON_HEIGHT, COLORS, RADII, SPACING } from "../../theme/tokens";
import { FONTS } from "../../theme/typography";

export interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  required,
  error,
  helperText,
  leftAdornment,
  rightAdornment,
  containerStyle,
  multiline,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          multiline && styles.multilineField,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}
      >
        {leftAdornment ? <View style={styles.adornment}>{leftAdornment}</View> : null}
        <TextInput
          placeholderTextColor={COLORS.textSecondary}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            style,
          ]}
          {...rest}
        />
        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
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
    lineHeight: 18,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  required: {
    color: COLORS.accent,
  },
  field: {
    minHeight: BUTTON_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
  },
  multilineField: {
    minHeight: 104,
    alignItems: "flex-start",
    paddingVertical: SPACING.sm,
  },
  fieldFocused: {
    borderColor: COLORS.primary,
  },
  fieldError: {
    borderColor: COLORS.error,
  },
  adornment: {
    marginHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 82,
    paddingVertical: 0,
  },
  errorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  helperText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

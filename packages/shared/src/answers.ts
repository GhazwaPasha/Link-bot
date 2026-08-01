import type { FormField } from "./fields";

/** Renders a stored raw answer value as Discord markup (mentions, resolved option labels, etc). */
export function formatAnswerValue(field: FormField, rawValue: string | undefined): string {
  if (!rawValue) return "—";
  switch (field.type) {
    case "user_select":
      return `<@${rawValue}>`;
    case "role_select":
      return `<@&${rawValue}>`;
    case "channel_select":
      return `<#${rawValue}>`;
    case "dropdown": {
      const opt = field.options?.find((o) => o.value === rawValue);
      return opt?.label ?? rawValue;
    }
    case "checkbox": {
      const values = rawValue.split(",").filter(Boolean);
      if (values.length === 0) return "—";
      return values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ");
    }
    default:
      return rawValue;
  }
}

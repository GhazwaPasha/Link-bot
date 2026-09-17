import { z } from "zod";

/**
 * Discord modals only support single-line/paragraph text inputs (max 5 per modal).
 * Every other field type is collected via a chained ephemeral select-menu message
 * that runs *before* the modal opens for any remaining text fields.
 *
 * "image" is the one type with no Discord-native equivalent — Discord modals can't
 * accept file uploads at all. It only ever renders on the public web-form page, and
 * validateFormFields() below rejects it for Discord/panel publishing.
 */
export const FIELD_TYPES = [
  "short_text",
  "paragraph",
  "dropdown",
  "checkbox",
  "user_select",
  "role_select",
  "channel_select",
  "image",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const TEXT_FIELD_TYPES: FieldType[] = ["short_text", "paragraph"];
export const SELECT_FIELD_TYPES: FieldType[] = [
  "dropdown",
  "checkbox",
  "user_select",
  "role_select",
  "channel_select",
];
/** Field types that only mean something inside Discord itself (picked from a live guild roster) — no equivalent on a public web page. */
export const DISCORD_ONLY_FIELD_TYPES: FieldType[] = ["user_select", "role_select", "channel_select"];

export const MAX_MODAL_TEXT_FIELDS = 5;
export const MAX_SELECT_FIELDS = 4; // 1 select menu per action row, 5 rows/message, keep 1 free for a "Continue" affordance if needed
export const MAX_DROPDOWN_OPTIONS = 25;

export const fieldOptionSchema = z.object({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  description: z.string().max(100).optional(),
});

export const formFieldSchema = z.object({
  id: z.string().min(1).max(40), // stable key used in answers map; kept short to fit Discord's 100-char custom_id budget
  type: z.enum(FIELD_TYPES),
  label: z.string().min(1).max(45), // Discord TextInput label limit
  placeholder: z.string().max(100).optional(),
  required: z.boolean().default(true),
  minLength: z.number().int().min(0).max(4000).optional(),
  maxLength: z.number().int().min(1).max(4000).optional(),
  options: z.array(fieldOptionSchema).max(MAX_DROPDOWN_OPTIONS).optional(), // dropdown/checkbox only
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FieldOption = z.infer<typeof fieldOptionSchema>;

export const formFieldsSchema = z.array(formFieldSchema).max(20);

export function isTextField(type: FieldType) {
  return TEXT_FIELD_TYPES.includes(type);
}

export function isSelectField(type: FieldType) {
  return SELECT_FIELD_TYPES.includes(type);
}

/** Splits a form's fields into the pre-modal select chain and the modal text fields. */
export function splitFieldsForFlow(fields: FormField[]) {
  const selectFields = fields.filter((f) => isSelectField(f.type));
  const textFields = fields.filter((f) => isTextField(f.type));
  return { selectFields, textFields };
}

export interface FieldValidationIssue {
  fieldId: string;
  message: string;
}

/** Validates a field list against Discord's structural limits, before it can be published. */
export function validateFormFields(fields: FormField[]): FieldValidationIssue[] {
  const issues: FieldValidationIssue[] = [];
  const { selectFields, textFields } = splitFieldsForFlow(fields);

  if (textFields.length > MAX_MODAL_TEXT_FIELDS) {
    issues.push({
      fieldId: textFields[MAX_MODAL_TEXT_FIELDS].id,
      message: `Discord modals support at most ${MAX_MODAL_TEXT_FIELDS} text fields.`,
    });
  }
  if (selectFields.length > MAX_SELECT_FIELDS) {
    issues.push({
      fieldId: selectFields[MAX_SELECT_FIELDS].id,
      message: `At most ${MAX_SELECT_FIELDS} dropdown/select-based fields are supported per form.`,
    });
  }
  for (const f of fields) {
    if ((f.type === "dropdown" || f.type === "checkbox") && (!f.options || f.options.length === 0)) {
      issues.push({ fieldId: f.id, message: "Dropdown/checkbox fields need at least one option." });
    }
    if (f.type === "image") {
      issues.push({ fieldId: f.id, message: "Image fields aren't supported in Discord modals — use the public web form instead." });
    }
  }
  return issues;
}

/**
 * Validates a field list for the public web-form page, which has none of Discord
 * modals' structural limits (field count, action-row caps) but can't render the
 * Discord-only picker types since a web visitor has no guild roster to pick from.
 */
export function validateWebFormFields(fields: FormField[]): FieldValidationIssue[] {
  const issues: FieldValidationIssue[] = [];
  for (const f of fields) {
    if (DISCORD_ONLY_FIELD_TYPES.includes(f.type)) {
      issues.push({ fieldId: f.id, message: `"${f.label || f.type}" only works inside Discord — remove it before enabling the public web form.` });
    }
    if ((f.type === "dropdown" || f.type === "checkbox") && (!f.options || f.options.length === 0)) {
      issues.push({ fieldId: f.id, message: "Dropdown/checkbox fields need at least one option." });
    }
  }
  return issues;
}

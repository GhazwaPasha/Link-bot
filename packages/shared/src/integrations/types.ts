import type { FormField } from "../fields";

/**
 * Structural subsets of the Drizzle `Form`/`Submission` types (defined in @discord-forms/db),
 * kept here instead of imported to avoid a circular package dependency — db's schema.ts already
 * imports FormField from this package. Both apps' real Form/Submission rows satisfy these shapes
 * without any cast, since TypeScript structural typing just works here.
 */
export interface IntegrationForm {
  id: string;
  name: string;
  fields: FormField[];
}

export interface IntegrationSubmission {
  id: string;
  guildId: string;
  userId: string;
  status: string;
  answers: Record<string, string>;
  createdAt: Date;
}

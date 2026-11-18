// Offices: a row per office per company. A department belongs to at most one office. Pure: no database, no framework.
// Country is the two-letter code companies.country uses (ISO 3166-1 alpha-2).

export interface OfficeInput {
  name: string;
  address: string;
  country: string;
}

/** Office names used before offices became rows (employees.office). Used to migrate and to map the country. */
export const LEGACY_OFFICE_COUNTRIES: Record<string, string> = { London: "GB", Accra: "GH", Windhoek: "NA" };

/** Returns an error message, or null when the office can be saved. */
export function validateOffice(input: OfficeInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return "The office name needs at least 2 characters.";
  if (name.length > 100) return "The office name must be 100 characters or fewer.";
  if (input.address.trim().length > 255) return "The address must be 255 characters or fewer.";
  if (!/^[A-Z]{2}$/.test(input.country)) return "The country must be a two-letter code, such as GB.";
  return null;
}

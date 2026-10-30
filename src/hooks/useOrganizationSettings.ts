// The organization settings are now loaded once by OrganizationSettingsProvider
// and read from context. This module stays as the import path every consumer
// already uses.
export { OrganizationSettingsProvider, useOrganizationSettings } from "@/contexts/OrganizationSettingsContext";
export type { OrganizationSettings } from "@/contexts/OrganizationSettingsContext";

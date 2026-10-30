// The profile, role and organization are now loaded once by ProfileProvider and
// read from context. This module stays as the import path every consumer already
// uses.
export { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
export type { Profile, UserRole, Organization } from "@/contexts/ProfileContext";

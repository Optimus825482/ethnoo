export type FieldMode = "required" | "optional" | "off";

// Individual form field definition (for custom fields)
export interface CustomField {
  id: string;
  label: string;
  placeholder: string;
  mode: FieldMode;
  type: "text" | "tel" | "textarea";
}

export interface GuestPageConfig {
  // Header
  showClock: boolean;
  hotelLogo: string | null;
  hotelLogoSize: number; // px height
  hotelName: string;
  locationLogo: boolean;
  locationName: boolean;

  // Colors
  bgStartColor: string;
  bgEndColor: string;
  headerTextColor: string;
  accentColor: string;

  // Form
  fields: {
    guestName: FieldMode;
    roomNumber: FieldMode;
    phone: FieldMode;
  };
  customFields: CustomField[];

  // Call button
  buttonText: string;
  buttonColor: string;
  buttonShape: "rounded" | "pill";

  // Footer
  footerText: string;
  footerBgColor: string;
  footerTextColor: string;

  // Status page
  showDriverName: boolean;
  showDriverLocation: boolean;
  showBuggyCode: boolean;
}

export const defaultGuestPageConfig: GuestPageConfig = {
  showClock: true,
  hotelLogo: null,
  hotelLogoSize: 80,
  hotelName: "ShuttleCall",
  locationLogo: true,
  locationName: true,
  bgStartColor: "#f8fafc",
  bgEndColor: "#eff6ff",
  headerTextColor: "#1a2b4a",
  accentColor: "#1a2b4a",
  fields: {
    guestName: "optional",
    roomNumber: "optional",
    phone: "optional",
  },
  customFields: [],
  buttonText: "Shuttle Çağır",
  buttonColor: "#1a2b4a",
  buttonShape: "rounded",
  footerText: "Shuttle Call System © 2025",
  footerBgColor: "#1a2b4a",
  footerTextColor: "#ffffff",
  showDriverName: true,
  showDriverLocation: true,
  showBuggyCode: true,
};

export function mergeConfigs(base: GuestPageConfig, overrides: Partial<GuestPageConfig>): GuestPageConfig {
  return {
    ...base,
    ...overrides,
    fields: { ...base.fields, ...(overrides.fields || {}) },
    customFields: overrides.customFields ?? base.customFields,
  };
}

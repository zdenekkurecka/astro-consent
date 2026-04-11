export interface ConsentCategory {
  label: string;
  description: string;
  default: boolean;
}

export interface ConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
  onConsent?: (state: ConsentState) => void;
  onChange?: (state: ConsentState) => void;
}

export interface ConsentState {
  version: number;
  timestamp: number;
  categories: Record<string, boolean>;
}

export interface SerializableConsentConfig {
  version: number;
  categories: Record<string, ConsentCategory>;
}

export interface ConsentAPI {
  get(): ConsentState | null;
  set(categories: Partial<Record<string, boolean>>): void;
  reset(): void;
  show(): void;
  showPreferences(): void;
}

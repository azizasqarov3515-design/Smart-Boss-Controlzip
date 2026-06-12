import { useState, useEffect, useCallback } from "react";

export interface Seller {
  id: string;
  name: string;
  phone: string;
}

export interface StoreSettings {
  storeName: string;
  storeSubtitle: string;
  storeAddress: string;
  sellers: Seller[];
  managerProfilePic?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  appLanguage?: "uz" | "ru";
  disabledUnits?: string[];
}

function settingsKey(managerId: number | null | undefined): string {
  if (managerId != null) return `smartboss_store_settings_${managerId}`;
  return "smartboss_store_settings";
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SMARTBOSS",
  storeSubtitle: "Veb aksessuarlar do'koni",
  storeAddress: "",
  sellers: [],
  telegramBotToken: "",
  telegramChatId: "",
  appLanguage: "uz",
  disabledUnits: [],
};

export function clearManagerSettings(managerId: number): void {
  localStorage.removeItem(settingsKey(managerId));
}

export function useSettings(managerId?: number | null) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const val = localStorage.getItem(settingsKey(managerId));
    if (val) {
      try {
        const parsed = JSON.parse(val) as StoreSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
    setIsLoading(false);
  }, [managerId]);

  const saveSettings = useCallback((next: StoreSettings) => {
    setSettings(next);
    localStorage.setItem(settingsKey(managerId), JSON.stringify(next));
  }, [managerId]);

  return { settings, saveSettings, isLoading };
}
export default useSettings;

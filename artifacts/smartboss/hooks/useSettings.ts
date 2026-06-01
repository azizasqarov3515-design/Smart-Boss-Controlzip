import AsyncStorage from "@react-native-async-storage/async-storage";
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
}

function settingsKey(managerId: number | null | undefined): string {
  if (managerId != null) return `smartboss_store_settings_${managerId}`;
  return "smartboss_store_settings";
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SMARTBOSS",
  storeSubtitle: "Android mobil aksessuarlar do'koni",
  storeAddress: "",
  sellers: [],
};

export async function clearManagerSettings(managerId: number): Promise<void> {
  await AsyncStorage.removeItem(settingsKey(managerId));
}

export function useSettings(managerId?: number | null) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    AsyncStorage.getItem(settingsKey(managerId)).then((val) => {
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
    });
  }, [managerId]);

  const saveSettings = useCallback(async (next: StoreSettings) => {
    setSettings(next);
    await AsyncStorage.setItem(settingsKey(managerId), JSON.stringify(next));
  }, [managerId]);

  return { settings, saveSettings, isLoading };
}

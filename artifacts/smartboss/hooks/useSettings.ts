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
}

const SETTINGS_KEY = "smartboss_store_settings";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SMARTBOSS",
  storeSubtitle: "Android mobil aksessuarlar do'koni",
  storeAddress: "",
  sellers: [{ id: "1", name: "Azizbek", phone: "+99893-483-12-89" }],
};

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val) as StoreSettings;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const saveSettings = useCallback(async (next: StoreSettings) => {
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  return { settings, saveSettings, isLoading };
}

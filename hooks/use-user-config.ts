"use client";

import { useEffect, useState } from "react";

export interface UserConfig {
  hospitalName: string;
  doctorName: string;
  speciality: string;
  avatarUrl: string;
  notifications: number;
  id?: string;
  nom?: string;
  prenoms?: string;
}

const USER_CONFIG_URL = "/user-config.json";

const isUserConfig = (value: unknown): value is UserConfig => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.hospitalName === "string" &&
    typeof config.doctorName === "string" &&
    typeof config.speciality === "string" &&
    typeof config.avatarUrl === "string" &&
    typeof config.notifications === "number" &&
    (config.id === undefined || typeof config.id === "string")
  );
};

export function useUserConfig() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserConfig = async () => {
      try {
        const response = await fetch(USER_CONFIG_URL, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Failed to load user config: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!isUserConfig(data)) {
          throw new Error("Invalid user config format.");
        }

        if (isMounted) {
          setConfig(data);
        }
      } catch (fetchError) {
        if (isMounted) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load user config.";

          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    config,
    loading,
    error,
  };
}

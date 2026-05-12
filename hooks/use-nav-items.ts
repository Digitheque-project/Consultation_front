"use client";

import { useEffect, useState } from "react";
import { readMockSessionFromBrowser } from "@/lib/auth/mock-auth-browser";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: string;
}

interface NavItemsResponse {
  items: NavItemConfig[];
}

const NAV_ITEMS_URL = "/nav-items.json";
const ACCUEIL_NAV_ITEMS_URL = "/nav-items-accueil.json";

const getNavItemsUrl = () => {
  const session = readMockSessionFromBrowser();
  if (session?.module === "accueil") {
    return ACCUEIL_NAV_ITEMS_URL;
  }
  return NAV_ITEMS_URL;
};

const isNavItemConfig = (value: unknown): value is NavItemConfig => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.label === "string" &&
    typeof item.href === "string" &&
    typeof item.icon === "string"
  );
};

const normalizeNavItems = (data: unknown): NavItemConfig[] => {
  if (Array.isArray(data)) {
    return data.filter(isNavItemConfig);
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const response = data as Partial<NavItemsResponse>;

  if (!Array.isArray(response.items)) {
    return [];
  }

  return response.items.filter(isNavItemConfig);
};

export function useNavItems() {
  const [items, setItems] = useState<NavItemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadNavItems = async () => {
      try {
        const response = await fetch(getNavItemsUrl(), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Failed to load navigation: ${response.status}`);
        }

        const data: unknown = await response.json();
        const normalizedItems = normalizeNavItems(data);

        if (isMounted) {
          setItems(normalizedItems);
        }
      } catch (fetchError) {
        if (isMounted) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load navigation.";

          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNavItems();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    items,
    loading,
    error,
  };
}

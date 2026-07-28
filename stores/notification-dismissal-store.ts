import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationDismissalStore {
  // Clé = `${consultationId}:${kind}` — un rejet ne vaut que pour ce type de
  // notification à ce moment-là. Si la nature de la notification change ensuite
  // (ex: "nouvelle consultation" -> "patient arrivé"), une nouvelle clé apparaît et
  // n'est pas couverte par le rejet précédent : la notification réapparaît.
  dismissedKeys: string[];
  dismiss: (key: string) => void;
  // Oublie les clés qui ne correspondent plus à une notification active (déjà
  // ouverte, terminée, ou dont le type a changé) — évite une croissance infinie.
  prune: (activeKeys: string[]) => void;
}

export const useNotificationDismissalStore = create<NotificationDismissalStore>()(
  persist(
    (set, get) => ({
      dismissedKeys: [],
      dismiss: (key) => {
        if (get().dismissedKeys.includes(key)) return;
        set((state) => ({ dismissedKeys: [...state.dismissedKeys, key] }));
      },
      prune: (activeKeys) => {
        const activeSet = new Set(activeKeys);
        const next = get().dismissedKeys.filter((key) => activeSet.has(key));
        if (next.length !== get().dismissedKeys.length) {
          set({ dismissedKeys: next });
        }
      },
    }),
    { name: "notification-dismissals" },
  ),
);

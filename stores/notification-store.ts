import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationStore {
  unreadCount: number;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      unreadCount: 0,
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      resetUnread: () => set({ unreadCount: 0 }),
    }),
    {
      name: "notification-storage", // name of the item in the storage (must be unique)
    }
  )
);

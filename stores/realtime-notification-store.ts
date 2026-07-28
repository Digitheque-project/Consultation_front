import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  source?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

interface RealtimeNotificationStore {
  notifications: RealtimeNotification[];
  unreadCount: number;
  setNotifications: (notifications: RealtimeNotification[]) => void;
  addNotification: (notification: RealtimeNotification) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

/** Notifications temps réel génériques (prescriptions, arrivées, etc.) — alimenté par le service notification CHU. */
export const useRealtimeNotificationStore = create<RealtimeNotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        }),
      addNotification: (notification) =>
        set((state) => {
          if (state.notifications.some((n) => n.id === notification.id)) return state;
          return {
            notifications: [notification, ...state.notifications].slice(0, 100),
            unreadCount: state.unreadCount + (notification.read ? 0 : 1),
          };
        }),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      markRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
        }),
    }),
    { name: "realtime-notification-storage" },
  ),
);

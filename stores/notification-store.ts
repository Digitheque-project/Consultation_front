import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Hospitalisation } from "@/lib/api/instances/hospitalisation";

export interface PatientInfo {
  id?: string;
  nom?: string;
  prenom?: string;
  dateNaissance?: string;
  sexe?: string;
  telephone?: string;
  adresse?: string;
  contactUrgence?: string;
  email?: string;
  profession?: string;
  cin?: string;
  nationalite?: string;
  situationMatrimoniale?: string;
  [key: string]: unknown;
}

export interface EnrichedNotification extends Hospitalisation {
  patient?: PatientInfo;
  receivedAt: number; // timestamp
  isRead?: boolean;
}

interface NotificationStore {
  unreadCount: number;
  notifications: EnrichedNotification[];
  incrementUnread: () => void;
  resetUnread: () => void;
  addNotification: (notification: EnrichedNotification) => void;
  setNotifications: (notifications: EnrichedNotification[]) => void;
  updateNotificationStatus: (id: string, status: EnrichedNotification["statusDemande"]) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      unreadCount: 0,
      notifications: [],
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      resetUnread: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),
      addNotification: (notification) =>
        set((state) => {
          // Éviter les doublons si possible
          const exists = state.notifications.some((n) => n.id === notification.id);
          if (exists) return state;

          const nextNotification = {
            ...notification,
            isRead: notification.isRead ?? false,
          };

          return {
            notifications: [nextNotification, ...state.notifications],
            unreadCount: state.unreadCount + (nextNotification.isRead ? 0 : 1),
          };
        }),
      setNotifications: (notifications) =>
        set((state) => {
          const merged = new Map<string, EnrichedNotification>();

          for (const current of state.notifications) {
            merged.set(current.id, current);
          }

          for (const incoming of notifications) {
            const existing = merged.get(incoming.id);
            if (existing) {
              merged.set(incoming.id, {
                ...existing,
                ...incoming,
                patient: incoming.patient ?? existing.patient,
                receivedAt: incoming.receivedAt ?? existing.receivedAt,
                isRead: incoming.isRead ?? existing.isRead ?? true,
              });
            } else {
              merged.set(incoming.id, {
                ...incoming,
                isRead: incoming.isRead ?? true,
              });
            }
          }

          const sorted = Array.from(merged.values()).sort(
            (a, b) => b.receivedAt - a.receivedAt,
          );

          const unreadCount = sorted.reduce(
            (count, item) => count + (item.isRead ? 0 : 1),
            0,
          );

          return { notifications: sorted, unreadCount };
        }),
      updateNotificationStatus: (id, status) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, statusDemande: status, isRead: true } : n
          );
          const unreadCount = notifications.reduce(
            (count, item) => count + (item.isRead ? 0 : 1),
            0,
          );

          return { notifications, unreadCount };
        }),
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: "notification-storage",
    }
  )
);

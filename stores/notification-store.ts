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
  /** Retire une hospitalisation de la liste (ex. après affectation de lit réussie). */
  removeNotification: (id: string) => void;
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
          const hasLit =
            typeof notification.litCode === "string" &&
            notification.litCode.trim().length > 0;
          if (hasLit) return state;

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
      /** Synchronise avec le serveur : les ids absents de la réponse sont retirés (ex. lit déjà affecté). */
      setNotifications: (notifications) =>
        set((state) => {
          const previousById = new Map(
            state.notifications.map((n) => [n.id, n] as const),
          );

          const next = notifications.map((incoming) => {
            const existing = previousById.get(incoming.id);
            return {
              ...incoming,
              patient: incoming.patient ?? existing?.patient,
              receivedAt: incoming.receivedAt ?? existing?.receivedAt ?? Date.now(),
              isRead: incoming.isRead ?? existing?.isRead ?? true,
            };
          });

          const sorted = next.sort((a, b) => b.receivedAt - a.receivedAt);

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
      removeNotification: (id) =>
        set((state) => {
          const notifications = state.notifications.filter((n) => n.id !== id);
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

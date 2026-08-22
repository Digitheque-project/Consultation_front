"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { playSound, SoundType } from "@/lib/sounds";
import { getConsultationExterneApiUrl, getConsultationExterneOrigin } from "@/lib/api/consultation-config";
import { useRealtimeNotificationStore } from "@/stores/realtime-notification-store";
import { checkPublicEnv } from "@/lib/env";

// Relayé par notre propre backend (src/notification/ côté Consultation_back)
// — historique REST ET flux temps réel WebSocket — plutôt qu'un appel direct
// au service notification : plus aucune variable NEXT_PUBLIC_* de service
// externe côté frontend, seulement la passerelle du CHU.
const CE_SERVICE_ID = checkPublicEnv("NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID", process.env.NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID);

interface NotifPayload {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  data?: {
    urgence?: string;
    statut?: string;
    [key: string]: unknown;
  };
}

interface Consultation {
  id: number;
  statut?: string;
  arriveeAccueil?: boolean;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    null
  );
}

function getUserIdFromToken(): string | null {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? payload.userId ?? payload.id ?? null;
  } catch {
    return null;
  }
}

function resolvePrescriptionSound(notif: NotifPayload): SoundType {
  const urgence = (notif.data?.urgence ?? "").toUpperCase();
  const type = (notif.type ?? "").toLowerCase();
  if (type === "arrival") return "arrival";
  // Enum prescription (post-changement contrat) : NORMAL / URGENT / TRES_URGENT.
  if (urgence === "TRES_URGENT" || type.includes("tres_urgent") || type.includes("stat")) return "prescription-stat";
  if (urgence === "URGENT" || type.includes("urgent")) return "prescription-urgent";
  return "prescription-incoming";
}

export function PrescriptionNotificationProvider() {
  const audioUnlocked = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  // id -> dernier état connu de arriveeAccueil, pour détecter la transition false -> true
  // (une consultation déjà vue qui vient d'être marquée "arrivée"), pas seulement les IDs inédits.
  const seenArrivalState = useRef<Map<number, boolean>>(new Map());
  const isFirstConsultLoad = useRef(true);
  const addNotification = useRealtimeNotificationStore((state) => state.addNotification);
  const setNotifications = useRealtimeNotificationStore((state) => state.setNotifications);

  // ─── Historique : récupère les notifications déjà reçues au chargement ────
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (!userId) return;

    fetch(getConsultationExterneApiUrl(`/notification/notifications/user/${userId}`), { signal: AbortSignal.timeout(8000) })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!Array.isArray(list)) return;
        setNotifications(
          list.map((n) => ({
            id: String(n.id),
            title: n.title ?? "",
            message: n.message ?? "",
            type: n.type ?? "info",
            source: n.source,
            data: n.data,
            createdAt: n.createdAt ?? new Date().toISOString(),
            read: Boolean(n.read),
          })),
        );
      })
      .catch(() => {});
  }, [setNotifications]);

  // Déverrouille AudioContext au premier geste utilisateur (contrainte navigateur)
  useEffect(() => {
    const unlock = () => {
      audioUnlocked.current = true;
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ─── Notifications temps réel (WebSocket) ─────────────────────────────────
  // Se connecte au relais WebSocket de notre propre backend (namespace
  // /notifications, cf. src/notification/notification.gateway.ts côté
  // Consultation_back), qui maintient lui-même une connexion amont vers le
  // vrai service notification du CHU et relaie chaque événement. Origine NUE
  // (pas /consultation/api) : les gateways WebSocket NestJS ne sont jamais
  // montées sous le préfixe REST global.
  useEffect(() => {
    const userId = getUserIdFromToken();
    const socket = io(`${getConsultationExterneOrigin()}/notifications`, {
      transports: ["websocket", "polling"],
      auth: {
        ...(userId ? { userId } : {}),
        ...(CE_SERVICE_ID ? { serviceId: CE_SERVICE_ID } : {}),
      },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Notifications] Connecté au service de notification");
    });

    socket.on("notification", (payload: NotifPayload) => {
      addNotification({
        id: payload.id ?? `${Date.now()}-${Math.random()}`,
        title: payload.title ?? "Nouvelle notification",
        message: payload.message ?? "",
        type: payload.type ?? "info",
        data: payload.data,
        createdAt: new Date().toISOString(),
        read: false,
      });

      if (!audioUnlocked.current) return;
      const sound = resolvePrescriptionSound(payload);
      playSound(sound);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Notifications] Erreur de connexion :", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ─── Arrivée de patients ──────────────────────────────────────────────────
  // Écoute le SSE du backend consultation : joue le son d'arrivée sur une nouvelle
  // consultation EN_ATTENTE (accueil a pris un rendez-vous) ET sur la transition
  // arriveeAccueil false -> true d'une consultation déjà connue (le patient vient
  // de se présenter physiquement à l'accueil, via POST /consultations/:id/arrival).
  useEffect(() => {
    const fetchConsultations = async (): Promise<Consultation[]> => {
      const token = getStoredToken();
      if (!token) return [];
      try {
        const res = await fetch(
          getConsultationExterneApiUrl("/consultations"),
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data?.data ?? []);
      } catch {
        return [];
      }
    };

    const detectArrivals = async () => {
      const consultations = await fetchConsultations();
      if (consultations.length === 0) return;

      if (isFirstConsultLoad.current) {
        consultations.forEach((c) => seenArrivalState.current.set(c.id, Boolean(c.arriveeAccueil)));
        isFirstConsultLoad.current = false;
        return;
      }

      // Deux cas déclenchent le son : une consultation jamais vue (nouveau rendez-vous
      // pris par l'accueil) ou une consultation déjà connue dont arriveeAccueil passe à
      // true (le patient vient de se présenter physiquement).
      let shouldPlayArrival = false;
      consultations.forEach((c) => {
        const previouslyArrived = seenArrivalState.current.get(c.id);
        const isNewConsultation = previouslyArrived === undefined;
        const justArrived = Boolean(c.arriveeAccueil) && previouslyArrived !== true;
        if ((isNewConsultation && c.statut === "EN_ATTENTE") || justArrived) {
          shouldPlayArrival = true;
        }
        seenArrivalState.current.set(c.id, Boolean(c.arriveeAccueil));
      });

      if (shouldPlayArrival && audioUnlocked.current) {
        playSound("arrival");
      }
    };

    const source = new EventSource(
      getConsultationExterneApiUrl("/consultations/events"),
    );
    source.addEventListener("message", () => detectArrivals());
    source.onerror = () => { /* reconnexion automatique */ };

    detectArrivals();
    const fallback = setInterval(detectArrivals, 60_000);

    return () => {
      source.close();
      clearInterval(fallback);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useNotificationStore, EnrichedNotification, PatientInfo } from "@/stores/notification-store";
import { patientApi } from "@/lib/api/instances/patient";
import { useTenant } from "@/hooks/use-tenant";

export function SocketNotificationProvider() {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { tenantId } = useTenant();
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef<boolean>(false);

  const toPatientInfo = (raw: unknown, fallbackId: string): PatientInfo | undefined => {
    if (!raw || typeof raw !== "object") return undefined;

    const record = raw as Record<string, unknown>;
    const pickString = (...values: unknown[]) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim().length > 0) {
          return value;
        }
      }
      return undefined;
    };

    return {
      id: pickString(record.id, fallbackId) ?? fallbackId,
      nom: pickString(record.nom, record.lastName, record.last_name, record.lastname),
      prenom: pickString(record.prenom, record.firstName, record.first_name, record.firstname),
      dateNaissance: pickString(record.dateNaissance, record.birthDate, record.birth_date),
      sexe: pickString(record.sexe, record.gender, record.sex),
    };
  };

  useEffect(() => {
    // 1. Initialiser l'audio une seule fois
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = new Audio("/notification.mp3");
    }

    // 2. Déverrouiller l'audio lors de la première interaction utilisateur
    const unlockAudio = () => {
      if (audioUnlocked.current || !audioRef.current) return;
      
      const audio = audioRef.current;
      
      // Essayer de jouer et pauser immédiatement pour débloquer le contexte
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audioUnlocked.current = true;
          
          window.removeEventListener("click", unlockAudio);
          window.removeEventListener("touchstart", unlockAudio);
          window.removeEventListener("keydown", unlockAudio);
          console.log("[Socket] Audio context successfully unlocked!");
        }).catch(() => {
          // Si ça échoue, on réessaiera au prochain clic
        });
      }
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    // 3. Connecter le Socket
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${apiUrl}/hospitalisations`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected to /hospitalisations namespace");
    });

    socket.on("hospitalisation.created", async (data) => {
      console.log("[Socket] New hospitalisation received:", data);
      
      let patientData = null;
      try {
        if (tenantId) {
          const response = await patientApi.getById(data.patientId, tenantId);
          patientData = toPatientInfo(response.data, data.patientId);
        }
      } catch (err) {
        console.error("[Socket] Failed to fetch patient data:", err);
      }

      const enriched: EnrichedNotification = {
        ...data,
        patient: patientData,
        receivedAt: Date.now(),
      };

      addNotification(enriched);

      if (audioRef.current) {
        const audio = audioRef.current;
        audio.currentTime = 0;
        audio.volume = 1;
        audio.loop = true; // La boucle native du navigateur fonctionne à 100% même en arrière-plan
        
        audio.play().catch((err) => {
          console.warn("[Socket] Audio autoplay prevented by browser:", err);
        });

        // Le fichier audio de base contient 3 "bips". 
        // Pour entendre 6 "bips", il suffit de laisser le fichier se jouer exactement 2 fois.
        const stopAudio = () => {
          audio.pause();
          audio.loop = false;
          audio.currentTime = 0;
        };

        if (audio.duration) {
          setTimeout(stopAudio, audio.duration * 1000 * 2);
        } else {
          // Si la durée n'est pas encore chargée
          audio.onloadedmetadata = () => {
            setTimeout(stopAudio, audio.duration * 1000 * 2);
          };
          // Fallback de sécurité au cas où (environ 6.5 secondes pour 2 lectures d'un son de 3.3s)
          setTimeout(stopAudio, 7000); 
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    return () => {
      socket.disconnect();
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [addNotification, tenantId]);

  return null;
}

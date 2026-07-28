"use client";

import { useEffect, useMemo } from "react";
import { useAllConsultations, useConsultationEventsSubscription } from "@/hooks/use-consultations";
import { useNotificationDismissalStore } from "@/stores/notification-dismissal-store";
import type { ConsultationApi } from "@/lib/api/consultation";

export type NotificationKind = "ARRIVAL" | "URGENT" | "REPORT" | "NORMAL";

export type DerivedNotification = {
  id: number;
  key: string;
  kind: NotificationKind;
  patientName: string;
  motif?: string;
  heure: string;
  date: string;
};

function resolveKind(c: ConsultationApi): NotificationKind {
  if (c.arriveeAccueil) return "ARRIVAL";
  if (c.urgence) return "URGENT";
  // Rendez-vous recréé suite à un report (patient non présenté à l'origine) — le
  // médecin doit pouvoir le distinguer d'une simple nouvelle consultation.
  if (c.estReport) return "REPORT";
  return "NORMAL";
}

// Moment le plus pertinent pour trier par récence : l'heure d'arrivée réelle pour une
// notification d'arrivée, sinon la création de la consultation (quand l'accueil l'a
// enregistrée) — le créneau programmé (date/heure) ne sert qu'en dernier recours.
function resolveTimestamp(c: ConsultationApi): number {
  if (c.arriveeAccueil && c.arriveeAccueilAt) return new Date(c.arriveeAccueilAt).getTime();
  if (c.createdAt) return new Date(c.createdAt).getTime();
  return new Date(`${c.date}T${c.heure}`).getTime();
}

/**
 * Notifications dérivées directement de l'état réel des consultations — pas de
 * journal séparé à synchroniser. Une notification existe tant que la consultation
 * est "EN_ATTENTE" (pas encore ouverte par le médecin) : elle disparaît toute seule
 * dès qu'il clique "Ouvrir" (statut -> EN_COURS), sans action manuelle nécessaire.
 *
 * Le rejet manuel est gardé par clé `id:kind`, pas juste par id : si la nature de la
 * notification change ensuite (ex: une consultation "normale" écartée dont le patient
 * arrive physiquement plus tard), une nouvelle clé apparaît et la notification
 * (verte, arrivée) revient — un rejet ne vaut que pour l'état au moment où il a été fait.
 */
export function useDerivedNotifications() {
  // Le bandeau de notification vit dans le layout global (Header) : sans cet abonnement
  // ici, la liste ne se rafraîchirait en direct que sur les pages qui l'appellent déjà.
  useConsultationEventsSubscription();

  const { data: consultations = [] } = useAllConsultations();
  const dismissedKeys = useNotificationDismissalStore((state) => state.dismissedKeys);
  const dismiss = useNotificationDismissalStore((state) => state.dismiss);
  const prune = useNotificationDismissalStore((state) => state.prune);

  const pending = useMemo(
    () => consultations.filter((c) => c.statut === "EN_ATTENTE"),
    [consultations],
  );

  // Important : la base de nettoyage doit couvrir TOUTES les consultations actives
  // (pas seulement celles "en attente"). Une fois ouverte, une consultation passe en
  // EN_COURS et sort de `pending` — si on ne gardait que les clés de `pending` ici, le
  // rejet fait à l'ouverture serait aussitôt effacé, et réapparaîtrait au moindre
  // "Retour" qui remet la consultation en attente. On n'oublie une clé que lorsque la
  // consultation elle-même disparaît de la liste (terminée/archivée).
  useEffect(() => {
    prune(consultations.map((c) => `${c.id}:${resolveKind(c)}`));
  }, [consultations, prune]);

  const notifications = useMemo<DerivedNotification[]>(() => {
    const dismissedSet = new Set(dismissedKeys);

    return pending
      .map((c) => {
        const kind = resolveKind(c);
        return { c, kind, key: `${c.id}:${kind}`, timestamp: resolveTimestamp(c) };
      })
      .filter(({ key }) => !dismissedSet.has(key))
      .sort((a, b) => {
        // Urgent toujours en tête, peu importe la récence ; le reste (arrivée +
        // normal mélangés) trié du plus récent au plus ancien.
        const aUrgent = a.kind === "URGENT" ? 0 : 1;
        const bUrgent = b.kind === "URGENT" ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        return b.timestamp - a.timestamp;
      })
      .map(({ c, kind, key }) => ({
        id: c.id,
        key,
        kind,
        patientName: c.patient?.displayName ?? "Patient",
        motif: c.motif,
        heure: c.heure,
        date: c.date,
      }));
  }, [pending, dismissedKeys]);

  return { notifications, dismiss };
}

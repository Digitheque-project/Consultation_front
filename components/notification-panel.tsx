"use client";

import { useRouter } from "next/navigation";
import { X, Check } from "lucide-react";
import { consultationApi } from "@/lib/api/consultation";
import { useDerivedNotifications, type DerivedNotification, type NotificationKind } from "@/hooks/use-derived-notifications";

const KIND_STYLES: Record<NotificationKind, { dot: string; bg: string; text: string; label: string }> = {
  ARRIVAL: { dot: "bg-emerald-500", bg: "bg-emerald-50/50", text: "text-emerald-700", label: "Patient arrivé" },
  URGENT: { dot: "bg-orange-500", bg: "bg-orange-50/60", text: "text-orange-700", label: "Consultation urgente" },
  REPORT: { dot: "bg-violet-500", bg: "bg-violet-50/50", text: "text-violet-700", label: "Rendez-vous reporté" },
  NORMAL: { dot: "bg-blue-500", bg: "bg-blue-50/40", text: "text-blue-700", label: "Nouvelle consultation" },
};

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { notifications, dismiss } = useDerivedNotifications();

  const handleOpen = async (n: DerivedNotification) => {
    onClose();
    // Le médecin a été mis au courant : la notification ne doit plus revenir même
    // s'il fait "Retour" sans traiter (ce qui remet la consultation en attente) —
    // sauf si l'accueil confirme entretemps l'arrivée du patient, ce qui change la
    // clé (id:ARRIVAL) et fait donc réapparaître une notification distincte.
    dismiss(n.key);
    try {
      await consultationApi.traiterConsultation(n.id, "ouvrir");
    } catch {
      // Non-bloquant : la page traitement se charge quand même, le statut sera
      // simplement resté "en attente" si l'appel a échoué.
    }
    // origin=fil-de-travail : un retour depuis cette consultation ramène toujours
    // au fil de travail, la notification n'ayant pas de "page d'origine" propre.
    router.push(`/modules/consultation-externe/traitement?id=${n.id}&origin=fil-de-travail`);
  };

  return (
    <div
      className="absolute right-0 top-full mt-3 w-[380px] sm:w-[420px] max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl z-[2147483647]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
        <span className="text-[14px] font-extrabold text-gray-900">Notifications</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-gray-400">
          Aucune notification pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {notifications.map((n) => {
            const style = KIND_STYLES[n.kind];
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpen(n); }}
                className={`flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer ${style.bg}`}
              >
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{n.patientName}</p>
                  <p className="mt-0.5 text-[11px] truncate">
                    <span className={`font-bold ${style.text}`}>{style.label}</span>
                    <span className="text-gray-400"> · {n.heure}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismiss(n.key); }}
                  title="Marquer comme lue sans l'ouvrir"
                  className="mt-0.5 shrink-0 rounded-full p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

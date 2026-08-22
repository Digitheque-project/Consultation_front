"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, History, Stethoscope, User } from "lucide-react";
import { getObservationsByPatient, type Observation } from "@/lib/dossier-patient-api";
import { EmptyState, LoadingSkeleton, formatDateTime, parseJsonOrPlain, prune, renderValue, TabButton } from "./shared";

interface PatientIdentity {
  nom?: string;
  prenom?: string;
  dateNaissance?: string;
  adresse?: string;
  sexe?: string;
}

interface Section {
  id: string;
  title: string;
  icon: typeof User;
  content: unknown;
}

function buildSections(obs: Observation, patientInfo: PatientIdentity | null): Section[] {
  const symptoms = parseJsonOrPlain(obs.symptoms, "motif");
  const medicalHistory = parseJsonOrPlain(obs.medicalHistory, "antecedents");
  const clinicalImpressions = parseJsonOrPlain(obs.clinicalImpressions, "diagnostic");
  const currentTreatments = parseJsonOrPlain(obs.currentTreatments, "traitement");
  const complementaryExams = parseJsonOrPlain(obs.complementaryExams, "examens");

  const constantes = {
    tension: obs.systolicBP && obs.diastolicBP ? `${obs.systolicBP}/${obs.diastolicBP} mmHg` : undefined,
    frequenceCardiaque: obs.heartRate ? `${obs.heartRate} bpm` : undefined,
    frequenceRespiratoire: obs.respiratoryRate ? `${obs.respiratoryRate} /min` : undefined,
    temperature: obs.temperature ? `${obs.temperature} °C` : undefined,
    saturationO2: obs.oxygenSaturation ? `${obs.oxygenSaturation} %` : undefined,
    poids: obs.weight ? `${obs.weight} kg` : undefined,
    taille: obs.height ? `${obs.height} cm` : undefined,
    imc: obs.bmi,
  };

  const examenPhysique = { ...constantes, ...parseJsonOrPlain(obs.physicalExamination, "observations") };

  return [
    { id: "identification", title: "Identification du patient", icon: User, content: patientInfo },
    { id: "motif", title: "Motif de consultation", icon: ClipboardList, content: symptoms },
    { id: "antecedents", title: "Antécédents", icon: ClipboardList, content: medicalHistory },
    { id: "examen", title: "Examen physique", icon: Stethoscope, content: examenPhysique },
    { id: "traitements", title: "Traitements en cours", icon: ClipboardList, content: currentTreatments },
    { id: "complementaires", title: "Examens complémentaires", icon: ClipboardList, content: complementaryExams },
    { id: "diagnostic", title: "Diagnostic clinique", icon: ClipboardList, content: clinicalImpressions },
  ];
}

function ObservationDetail({ obs, patientInfo }: { obs: Observation; patientInfo: PatientIdentity | null }) {
  const sections = buildSections(obs, patientInfo).filter((s) => {
    if (s.id === "identification") return Boolean(patientInfo);
    return prune(s.content) !== undefined;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
          <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.5} />
        </span>
        <div className="text-[13.5px] font-semibold text-emerald-900">
          {obs.createdAt ? `Enregistrée le ${formatDateTime(obs.createdAt)}` : "Enregistrée"}
          {obs.isSigned ? " — signée" : ""}
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState label="Aucune section renseignée." />
      ) : (
        sections.map((section) => {
          const content = section.id === "identification" ? patientInfo : prune(section.content);
          if (!content) return null;
          const Icon = section.icon;
          return (
            <section key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center gap-3 border-b border-slate-100 bg-[#EAF3FA] px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                  <Icon className="h-4 w-4 text-[#006A8C]" strokeWidth={2} />
                </span>
                <h3 className="text-[13.5px] font-bold text-[#006A8C]">{section.title}</h3>
              </header>
              <div className="px-4 py-4">{renderValue(content)}</div>
            </section>
          );
        })
      )}
    </div>
  );
}

export function ObservationPanel({
  patientId,
  chuId,
  patientInfo,
}: {
  patientId: string;
  chuId?: string;
  patientInfo: PatientIdentity | null;
}) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"latest" | "history">("latest");
  const [selected, setSelected] = useState<Observation | null>(null);

  useEffect(() => {
    if (!chuId) {
      setLoading(false);
      setError("CHU non identifié — impossible de charger les observations.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getObservationsByPatient(patientId, chuId)
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        setObservations(sorted);
        setSelected(sorted[0] ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, chuId]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <EmptyState label={error} />;
  if (observations.length === 0) return <EmptyState label="Aucune observation enregistrée pour ce patient." />;

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        <TabButton active={view === "latest"} onClick={() => setView("latest")} icon={Stethoscope} label="Observation récente" />
        <TabButton active={view === "history"} onClick={() => setView("history")} icon={History} label="Historique des observations" />
      </div>

      {view === "latest" && selected ? (
        <ObservationDetail obs={selected} patientInfo={patientInfo} />
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => (
            <button
              key={obs.id}
              type="button"
              onClick={() => {
                setSelected(obs);
                setView("latest");
              }}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-[#006A8C]/40 hover:bg-[#EAF3FA]/40"
            >
              <span className="text-[13px] font-semibold text-slate-800">
                {obs.observationType ?? "Observation"}
                {obs.isSigned ? (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Signée</span>
                ) : null}
              </span>
              <span className="text-[11px] font-medium text-slate-400">{formatDateTime(obs.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

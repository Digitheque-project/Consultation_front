"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  consultationApi,
  getVisiteLabel,
  type EtapeParcours,
  type ParcoursConsultation,
} from "@/lib/api/consultation";
import { getHistoriquePatient } from "@/features/prescription/lib/api";
import { getResultatsByPatient, type ResultatParaclinique } from "@/lib/dossier-patient-api";

/**
 * Archive d'une prise en charge : tout ce que le médecin a fait au patient,
 * étape par étape (consultation initiale puis chaque contrôle) — observation,
 * diagnostics, paramètres, médicaments, examens demandés et leurs résultats.
 * Sert à vérifier le travail médical après coup : rien ne doit y manquer.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Prescription = Record<string, any> & { _type: string; createdAt?: string; statut?: string };

const TYPES: Record<string, string> = {
  medicale: "Médicaments",
  nonMedicale: "Prescription non médicamenteuse",
  soinsInfirmier: "Soins infirmiers",
  surveillance: "Surveillance",
  transfusion: "Transfusion",
  labo: "Laboratoire",
  imagerie: "Imagerie",
  anapath: "Anatomopathologie",
  endoscopie: "Endoscopie",
  dialyse: "Dialyse",
  eeg: "EEG",
  ecg: "ECG",
  polysomnographie: "Polysomnographie",
  orl: "ORL",
  actesOrl: "Actes ORL",
  kine: "Kinésithérapie",
  bloc: "Intervention chirurgicale",
  cpa: "CPA",
};

// Jour local (heure du CHU) d'une date ou d'un horodatage.
const jour = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const veille = (j: string) => {
  const x = new Date(`${j}T12:00:00`);
  x.setDate(x.getDate() - 1);
  return jour(x.toISOString());
};
const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const dateHeureFr = (d?: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// Étape à laquelle rattacher un acte daté : la dernière étape tenue ce jour-là ou avant.
function etapeDuJour<T>(etapes: EtapeParcours[], date: string | undefined, parEtape: Map<number, T[]>, item: T) {
  if (!etapes.length) return;
  const j = jour(date);
  let cible = etapes[0];
  for (const e of etapes) if (jour(e.date) <= j) cible = e;
  parEtape.set(cible.id, [...(parEtape.get(cible.id) ?? []), item]);
}

// Lignes lisibles d'une prescription, quel que soit son type.
function lignesPrescription(p: Prescription): string[] {
  const l: string[] = [];
  for (const m of p.medicaments ?? []) {
    l.push(
      [
        m.nom,
        m.dose,
        m.voie,
        m.frequence || (m.frequenceValeur ? `${m.frequenceValeur} ${String(m.frequenceType ?? "").toLowerCase().replace("_", " ")}` : ""),
        m.duree || (m.dureeJours ? `${m.dureeJours} j` : ""),
        m.quantite ? `qté ${m.quantite}` : "",
        m.dateArret ? `arrêté le ${dateFr(m.dateArret)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }
  for (const c of p.cocktails ?? []) l.push(`Cocktail : ${c.nom ?? (c.composants ?? []).map((x: { nom: string }) => x.nom).join(" + ")}`);
  for (const a of p.analyses ?? []) l.push(String(a));
  for (const it of [...(p.items ?? []), ...(p.demandes ?? []), ...(p.examensImagerie ?? []), ...(p.ActeBloc ?? []), ...(p.parametres ?? []), ...(p.produits ?? [])]) {
    const t = it.libelle || it.nom || it.type || it.examen || it.parametre || it.produit || it.typeExamen || it.typeActe;
    if (t) l.push([t, it.quantite ? `× ${it.quantite}` : "", it.frequence ?? ""].filter(Boolean).join(" "));
  }
  for (const k of ["typeEEG", "typeKine", "typeDialyse", "typeChirurgie", "intervention", "typeExamen", "typeActe"]) {
    if (texte(p[k])) l.push(p[k]);
  }
  if (!l.length && texte(p.renseignements)) l.push(p.renseignements);
  return l;
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{titre}</p>
      {children}
    </div>
  );
}

function Champ({ titre, valeur }: { titre: string; valeur?: string | null }) {
  const v = texte(valeur);
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{titre}</p>
      <p className={cn("mt-1 whitespace-pre-wrap text-[13px]", v ? "text-slate-800" : "italic text-slate-400")}>
        {v || "Non renseigné"}
      </p>
    </div>
  );
}

// Remonter le composant (key) pour une autre consultation : l'état repart de zéro.
export function ParcoursArchive({ consultationId, chuId }: { consultationId: number; chuId?: string }) {
  const [parcours, setParcours] = useState<ParcoursConsultation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [resultats, setResultats] = useState<ResultatParaclinique[] | null>(null);
  const [erreurAnnexes, setErreurAnnexes] = useState<string[]>([]);

  useEffect(() => {
    let annule = false;
    consultationApi
      .getParcours(consultationId)
      .then((p) => !annule && setParcours(p))
      .catch(() => !annule && setErreur("Impossible de charger le parcours de cette consultation."));
    return () => {
      annule = true;
    };
  }, [consultationId]);

  // Médicaments, examens et résultats : enregistrés par les autres services,
  // sur la période du parcours, par les médecins qui l'ont mené.
  useEffect(() => {
    if (!parcours?.etapes.length) return;
    let annule = false;
    const patientId = parcours.etapes[0].patientId;
    const debut = jour(parcours.etapes[0].date);
    const derniere = parcours.etapes[parcours.etapes.length - 1];
    // Fin : le jour où la dernière étape a été close (elle peut l'être après sa date prévue).
    const fin = [jour(derniere.date), jour(derniere.updatedAt)].sort().pop() as string;
    const medecins = new Set(parcours.etapes.map((e) => e.medecinId));
    const dansLaPeriode = (d?: string) => {
      const j = jour(d);
      return Boolean(j) && j >= debut && j <= fin;
    };
    // La veille : le serveur filtre en UTC, le tri fin se fait ici en heure locale.
    getHistoriquePatient(patientId, { dateFrom: veille(debut), dateTo: fin })
      .then((r: unknown) => {
        if (annule) return;
        const liste = (Array.isArray(r) ? r : ((r as { data?: unknown[] })?.data ?? [])) as Prescription[];
        setPrescriptions(liste.filter((p) => medecins.has(p.prescripteurId) && dansLaPeriode(p.createdAt)));
      })
      .catch(() => {
        if (annule) return;
        setPrescriptions([]);
        setErreurAnnexes((e) => [...e, "les prescriptions (service Prescription injoignable)"]);
      });
    if (chuId) {
      getResultatsByPatient(patientId, chuId)
        .then((r) => !annule && setResultats(r.filter((x) => (x.dateDemande ? dansLaPeriode(x.dateDemande) : jour(x.dateResultat) >= debut))))
        .catch(() => {
          if (annule) return;
          setResultats([]);
          setErreurAnnexes((e) => [...e, "les résultats d'examens (dossier patient injoignable)"]);
        });
    }
    return () => {
      annule = true;
    };
  }, [parcours, chuId]);

  const { prescriptionsParEtape, resultatsParEtape } = useMemo(() => {
    const pe = new Map<number, Prescription[]>();
    const re = new Map<number, ResultatParaclinique[]>();
    const etapes = parcours?.etapes ?? [];
    for (const p of prescriptions ?? []) etapeDuJour(etapes, p.createdAt, pe, p);
    for (const r of resultats ?? []) etapeDuJour(etapes, r.dateDemande ?? r.dateResultat, re, r);
    return { prescriptionsParEtape: pe, resultatsParEtape: re };
  }, [parcours, prescriptions, resultats]);

  if (erreur) return <p className="rounded-2xl bg-red-50 p-4 text-[13px] text-red-700">{erreur}</p>;
  if (!parcours) return <p className="py-8 text-center text-[13px] text-slate-400">Chargement du parcours…</p>;

  // Sans CHU connu, le dossier patient ne peut pas être lu : pas d'attente de résultats.
  const chargementAnnexes = prescriptions === null || (Boolean(chuId) && resultats === null);

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-500">
        {parcours.etapes.length} étape{parcours.etapes.length > 1 ? "s" : ""} dans cette prise en charge
        {" "}({dateFr(parcours.etapes[0].date)} → {dateFr(parcours.etapes[parcours.etapes.length - 1].date)}).
      </p>
      {erreurAnnexes.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-[12px] text-amber-800">
          Archive incomplète pour l&apos;instant : impossible de charger {erreurAnnexes.join(" et ")}.
        </p>
      )}

      <ol className="space-y-4">
        {parcours.etapes.map((e) => {
          const obs = e.observation;
          const params = (e.parametresCliniques ?? []).filter((p) => texte(p.valeur));
          const presc = prescriptionsParEtape.get(e.id) ?? [];
          const res = resultatsParEtape.get(e.id) ?? [];
          const selection = e.id === consultationId;
          return (
            <li
              key={e.id}
              className={cn(
                "break-inside-avoid rounded-2xl border p-4 space-y-3",
                selection ? "border-[#005b82]/40 bg-[#F3FAFC]" : "border-slate-200 bg-white",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-extrabold text-slate-900">
                  {e.isControl ? getVisiteLabel(e) : "Consultation initiale"}
                  {e.estReport ? " (reportée)" : ""}
                </p>
                <p className="text-[12px] font-semibold text-slate-500">
                  {dateFr(e.date)} — {e.heure}
                  {e.medecinNom ? ` · Dr ${e.medecinNom}` : ""}
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Statut : {e.statut}
                {e.urgence ? " · Urgence" : ""}
                {e.arriveeAccueilAt ? ` · arrivé à ${dateHeureFr(e.arriveeAccueilAt)}` : ""}
              </p>

              <Champ titre="Motif" valeur={e.motif} />

              <Bloc titre="Observation médicale">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Champ titre="Suspicion diagnostique" valeur={obs?.diagnosticSuspicion} />
                  <Champ titre="Diagnostic retenu" valeur={obs?.diagnosticRetenu || obs?.diagnostic} />
                </div>
                <div className="mt-2 grid gap-2">
                  <Champ titre="Observations / notes" valeur={obs?.notes} />
                  {texte(obs?.noteControle) && <Champ titre="Note de contrôle" valeur={obs?.noteControle} />}
                </div>
              </Bloc>

              <Bloc titre="Paramètres cliniques">
                {params.length ? (
                  <div className="flex flex-wrap gap-2">
                    {params.map((p, i) => (
                      <span key={p.id ?? i} className="rounded-full bg-[#CFE9EF] px-3 py-1 text-[12px] font-semibold text-[#005b82]">
                        {p.nom} : {p.valeur} {p.unite ?? ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] italic text-slate-400">Aucun paramètre mesuré.</p>
                )}
              </Bloc>

              <Bloc titre="Traitements et examens prescrits">
                {chargementAnnexes ? (
                  <p className="text-[12px] text-slate-400">Chargement…</p>
                ) : presc.length ? (
                  <ul className="space-y-2">
                    {presc.map((p) => (
                      <li key={`${p._type}-${p.id}`} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[12px] font-bold text-slate-800">{TYPES[p._type] ?? p._type}</p>
                          <p className="text-[11px] text-slate-500">
                            {dateHeureFr(p.createdAt)}
                            {p.statut ? ` · ${p.statut}` : ""}
                            {p._type === "medicale" ? (p.ordonnance ? " · ordonnance faite" : " · sans ordonnance") : ""}
                          </p>
                        </div>
                        <ul className="mt-1 list-disc pl-5 text-[12px] text-slate-700">
                          {lignesPrescription(p).map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                        {texte(p.remarques || p.remarque || p.notes) && (
                          <p className="mt-1 text-[12px] text-slate-500">Remarque : {p.remarques || p.remarque || p.notes}</p>
                        )}
                        {texte(p.interpretation) && (
                          <p className="mt-1 text-[12px] text-slate-700">
                            <span className="font-bold">Interprétation : </span>
                            {p.interpretation}
                            {p.interpreteLe ? ` (${dateFr(p.interpreteLe)})` : ""}
                          </p>
                        )}
                        {texte(p.motifRefus) && <p className="mt-1 text-[12px] text-red-600">Refusée : {p.motifRefus}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] italic text-slate-400">Aucune prescription enregistrée à cette étape.</p>
                )}
              </Bloc>

              {(e.nonMedicamentPrescriptions ?? []).some((nm) => nm.recommandationsNotes || nm.rdvMotif || nm.examenService || nm.examenMotif || nm.hospitalisationMotif) && (
                <Bloc titre="Décisions de la consultation">
                  <div className="space-y-1 rounded-xl border border-slate-100 p-3 text-[12px] text-slate-700">
                    {(e.nonMedicamentPrescriptions ?? []).map((nm, i) => (
                      <div key={nm.id ?? i} className="space-y-1">
                        {nm.recommandationsNotes && <p><span className="font-bold">Recommandations : </span>{nm.recommandationsNotes}</p>}
                        {nm.rdvMotif && (
                          <p>
                            <span className="font-bold">Contrôle demandé : </span>
                            {nm.rdvMotif}
                            {nm.rdvDate ? ` — ${dateFr(nm.rdvDate)}` : ""}
                          </p>
                        )}
                        {(nm.examenService || nm.examenMotif) && (
                          <p>
                            <span className="font-bold">Examen : </span>
                            {[nm.examenService, nm.examenMotif].filter(Boolean).join(" — ")}
                            {nm.reponseStatus && nm.reponseStatus !== "EN_ATTENTE" ? ` (${nm.reponseStatus})` : ""}
                          </p>
                        )}
                        {nm.hospitalisationMotif && (
                          <p>
                            <span className="font-bold">Hospitalisation : </span>
                            {[nm.hospitalisationMotif, nm.hospitalisationService].filter(Boolean).join(" — ")}
                            {nm.hospitalisationStatus ? ` (${nm.hospitalisationStatus})` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Bloc>
              )}

              <Bloc titre="Résultats d'examens">
                {chargementAnnexes ? (
                  <p className="text-[12px] text-slate-400">Chargement…</p>
                ) : res.length ? (
                  <ul className="space-y-2">
                    {res.map((r) => (
                      <li key={r.id} className="rounded-xl border border-slate-100 p-3 text-[12px] text-slate-700">
                        <p className="font-bold text-slate-800">
                          {[r.type, r.examen].filter(Boolean).join(" — ") || "Examen"}
                          {r.serviceSource ? ` · ${r.serviceSource}` : ""}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Demandé le {dateFr(r.dateDemande)} · résultat le {dateFr(r.dateResultat)}
                          {r.statut ? ` · ${r.statut}` : ""}
                        </p>
                        {texte(r.resultatTexte) ? (
                          <p className="mt-1 whitespace-pre-wrap">{r.resultatTexte}</p>
                        ) : (
                          <p className="mt-1 italic text-slate-400">Pas de résultat écrit.</p>
                        )}
                        {texte(r.commentaire) && <p className="mt-1 text-slate-500">Commentaire : {r.commentaire}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] italic text-slate-400">Aucun résultat reçu pour cette étape.</p>
                )}
              </Bloc>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

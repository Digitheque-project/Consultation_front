"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getVisiteLabel, type EtapeParcours } from "@/lib/api/consultation";
import { getHistoriquePatient } from "@/features/prescription/lib/api";
import { getResultatsByPatient, type ResultatParaclinique } from "@/lib/dossier-patient-api";
import { libelleStatut as libelleStatutPrescription } from "@/lib/libelle-statut";

/**
 * Archive d'une prise en charge : tout ce que le médecin a fait au patient,
 * étape par étape (consultation initiale puis chaque contrôle) — observation,
 * diagnostics, paramètres, médicaments, examens demandés et leurs résultats.
 * Sert à vérifier le travail médical après coup : rien ne doit y manquer.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Prescription = Record<string, any> & { _type: string; createdAt?: string; statut?: string };

const STATUTS: Record<string, string> = {
  TERMINE: "Terminée",
  REPORTEE: "Reportée",
  HOSPITALISE: "Hospitalisation demandée",
  EN_COURS: "En cours",
  EN_ATTENTE: "En attente",
  EN_ATTENTE_CONTROLE: "Contrôle en attente",
  EN_ATTENTE_PARACLINIQUE: "En attente d'examens",
};
const libelleStatut = (s?: string | null) =>
  !s ? "—" : STATUTS[s.toUpperCase()] ?? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

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

/**
 * Diagnostic retenu d'une observation. L'ancien champ `diagnostic` reçoit, à
 * défaut de diagnostic, les notes (ex. « Motif d'absence de traitement : … ») :
 * il ne sert de repli que s'il contient vraiment autre chose que les notes.
 */
export function diagnosticRetenuDe(obs?: { diagnosticRetenu?: string | null; diagnostic?: string | null; diagnosticSuspicion?: string | null; notes?: string | null } | null): string {
  const retenu = texte(obs?.diagnosticRetenu);
  if (retenu) return retenu;
  const ancien = texte(obs?.diagnostic);
  if (!ancien || ancien === texte(obs?.notes) || ancien === texte(obs?.diagnosticSuspicion)) return "";
  return ancien;
}

// Jour où l'étape a réellement été faite ; la date prévue du rendez-vous
// (souvent antérieure) n'est qu'un repli.
const faiteLe = (e: EtapeParcours) => e.dateRealisation ?? e.date;

// Étape à laquelle rattacher un acte daté : la dernière étape faite ce jour-là ou avant.
function etapeDuJour<T>(etapes: EtapeParcours[], date: string | undefined, parEtape: Map<number, T[]>, item: T) {
  if (!etapes.length) return;
  const j = jour(date);
  let cible = etapes[0];
  for (const e of etapes) if (jour(faiteLe(e)) <= j) cible = e;
  parEtape.set(cible.id, [...(parEtape.get(cible.id) ?? []), item]);
}

const MODALITES: Record<string, string> = {
  radio: "Radiographie",
  radiographie: "Radiographie",
  scanner: "Scanner",
  echographie: "Échographie",
  irm: "IRM",
  geste: "Geste interventionnel",
  radioSpeciale: "Radio spéciale",
  radio_speciale: "Radio spéciale",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Objet = Record<string, any>;

// Examens d'une prescription d'imagerie : rangés par modalité dans `examens`
// ({ scanner: {...}, radio: [...] }), ou en tableau dans les anciennes.
function examensImagerie(p: Prescription): { modalite: string; item: Objet }[] {
  const ex = p.examens;
  const objet = (it: unknown): Objet | null =>
    it && typeof it === "object" ? (it as Objet) : typeof it === "string" ? { type: it } : null;
  const out: { modalite: string; item: Objet }[] = [];
  if (Array.isArray(ex)) {
    for (const it of ex) {
      const item = objet(it);
      if (!item) continue;
      const t = String(item.typeExamen ?? item.type ?? "");
      out.push({ modalite: MODALITES[t.toLowerCase()] ?? MODALITES[t] ?? (t || "Examen"), item });
    }
    return out;
  }
  if (!ex || typeof ex !== "object") return out;
  for (const [cle, v] of Object.entries(ex as Objet)) {
    const modalite = MODALITES[cle] ?? cle;
    for (const it of Array.isArray(v) ? v : [v]) {
      const item = objet(it);
      if (item) out.push({ modalite, item });
    }
  }
  return out;
}

function libelleExamenImagerie(modalite: string, item: Objet): string {
  const sousType =
    item.region || item.scanType || item.echoType || item.rxType || item.gesteType || item.rxspType ||
    (item.type && String(item.type).toLowerCase() !== modalite.toLowerCase() ? item.type : "") ||
    item.libelle || item.nom || "";
  const incidences = Array.isArray(item.rxIncidences) ? item.rxIncidences : Array.isArray(item.incidences) ? item.incidences : [];
  return [modalite, sousType, incidences.length ? `incidences : ${incidences.join(", ")}` : ""].filter(Boolean).join(" — ");
}

// Champs lisibles d'une demande (jamais les identifiants techniques). Les
// variantes préfixées par modalité (scanGlasgow, echoPrecisions...) sont
// ramenées à leur nom commun.
const CHAMPS: Record<string, string> = {
  renseignementsCliniques: "Renseignements cliniques",
  renseignement: "Renseignements cliniques",
  renseignements: "Renseignements cliniques",
  questionRadio: "Question posée au radiologue",
  alertes: "Alertes",
  urgence: "Urgence",
  statutPatient: "Statut du patient",
  type: "Sous-type",
  doppler: "Doppler",
  incidences: "Incidences",
  precisions: "Précisions",
  preparation: "Préparation",
  glasgow: "Glasgow",
  agite: "Agitation",
  allergie: "Allergie",
  allergieDetail: "Détail de l'allergie",
  creatinine: "Créatinine",
  clearance: "Clairance",
  diabete: "Diabète",
  cote: "Côté",
  objectifs: "Objectifs",
  indication: "Indication",
  notes: "Notes",
  remarques: "Remarques",
  remarque: "Remarque",
  quantite: "Quantité",
  frequence: "Fréquence",
  duree: "Durée",
};
const PREFIXES = /^(scan|echo|rxsp|rx|geste)(?=[A-Z])/;

function champsLisibles(o: Objet, exclure: string[] = []): { titre: string; valeur: string }[] {
  const vus = new Set<string>();
  const out: { titre: string; valeur: string }[] = [];
  for (const [cleBrute, v] of Object.entries(o ?? {})) {
    let cle = cleBrute.replace(PREFIXES, "");
    cle = cle.charAt(0).toLowerCase() + cle.slice(1);
    const titre = CHAMPS[cle];
    if (!titre || exclure.includes(cle) || vus.has(titre)) continue;
    const valeur =
      typeof v === "boolean"
        ? v ? "Oui" : "Non"
        : Array.isArray(v)
          ? v.filter((x) => typeof x !== "object").join(", ")
          : v && typeof v === "object"
            ? ""
            : texte(String(v ?? ""));
    if (!valeur) continue;
    if (cle === "urgence") {
      vus.add(titre);
      out.push({ titre, valeur: libelleStatutPrescription(valeur) });
      continue;
    }
    vus.add(titre);
    out.push({ titre, valeur });
  }
  return out;
}

// Demandes détaillées d'une prescription (une par examen demandé).
function demandesDetaillees(p: Prescription): { titre: string; item: Objet }[] {
  if (p._type === "imagerie") {
    return examensImagerie(p).map(({ modalite, item }) => ({ titre: libelleExamenImagerie(modalite, item), item }));
  }
  const liste: unknown[] = [...(p.demandes ?? []), ...(p.items ?? []), ...(p.produits ?? [])];
  return liste
    .filter((it): it is Objet => Boolean(it) && typeof it === "object")
    .map((it) => ({
      titre: String(it.libelle || it.nom || it.typeExamen || it.autreExamen || it.examen || it.produit || it.typeActe || it.type || "Examen"),
      item: it,
    }));
}

// Résultats rattachés à cette prescription : par son identifiant, ou par
// l'identifiant de résultat noté sur chaque examen (imagerie).
function resultatsDePrescription(p: Prescription, tous: ResultatParaclinique[]): ResultatParaclinique[] {
  const ids = new Set<string>();
  for (const { item } of demandesDetaillees(p)) if (item.idResult) ids.add(String(item.idResult));
  return tous.filter((r) => (r.prescriptionId && r.prescriptionId === p.id) || ids.has(String(r.id)));
}

function CarteResultat({ r }: { r: ResultatParaclinique }) {
  const fichiers = Array.isArray(r.resultatFichiers)
    ? (r.resultatFichiers as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-[12px] text-slate-700">
      <p className="font-bold text-slate-800">
        {[r.type, r.examen].filter(Boolean).join(" — ") || "Examen"}
        {r.serviceSource ? ` · ${r.serviceSource}` : ""}
      </p>
      <p className="text-[11px] text-slate-500">
        Demandé le {dateFr(r.dateDemande)} · résultat le {dateFr(r.dateResultat)}
        {r.statut ? ` · ${libelleStatutPrescription(r.statut)}` : ""}
      </p>
      {texte(r.resultatTexte) ? (
        <p className="mt-1 whitespace-pre-wrap">{r.resultatTexte}</p>
      ) : (
        <p className="mt-1 italic text-slate-400">Pas de résultat écrit.</p>
      )}
      {texte(r.commentaire) && <p className="mt-1 text-slate-500">Conclusion / commentaire : {r.commentaire}</p>}
      {fichiers.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-2 print:hidden">
          {fichiers.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="font-semibold text-[#005b82] underline">
              Fichier {i + 1}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}

// Lignes lisibles d'une prescription, quel que soit son type.
function lignesPrescription(p: Prescription): string[] {
  const l: string[] = [];
  if (p._type === "imagerie") {
    for (const { modalite, item } of examensImagerie(p)) l.push(libelleExamenImagerie(modalite, item));
    if (l.length) return l;
  }
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
// Détail d'un parcours (consultation initiale + contrôles) déjà chargé.
export function ParcoursArchive({
  parcours,
  chuId,
  selectionId,
}: {
  parcours: { etapes: EtapeParcours[] };
  chuId?: string;
  selectionId?: number;
}) {
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(null);
  const [resultats, setResultats] = useState<ResultatParaclinique[] | null>(null);
  // Tous les résultats du patient : celui d'un examen peut arriver après la fin
  // de la prise en charge, il reste rattaché à sa prescription.
  const [tousResultats, setTousResultats] = useState<ResultatParaclinique[]>([]);
  const [detailsOuverts, setDetailsOuverts] = useState<Set<string>>(new Set());
  const [erreurAnnexes, setErreurAnnexes] = useState<string[]>([]);

  // Médicaments, examens et résultats : enregistrés par les autres services,
  // sur la période du parcours, par les médecins qui l'ont mené.
  useEffect(() => {
    if (!parcours?.etapes.length) return;
    let annule = false;
    const patientId = parcours.etapes[0].patientId;
    const premiere = parcours.etapes[0];
    const debut = [jour(premiere.date), jour(faiteLe(premiere))].sort()[0];
    const derniere = parcours.etapes[parcours.etapes.length - 1];
    // Fin : le jour où la dernière étape a été close (elle peut l'être après sa date prévue).
    const fin = [jour(derniere.date), jour(faiteLe(derniere)), jour(derniere.updatedAt)].sort().pop() as string;
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
        .then((r) => {
          if (annule) return;
          setTousResultats(r);
          setResultats(r.filter((x) => (x.dateDemande ? dansLaPeriode(x.dateDemande) : jour(x.dateResultat) >= debut)));
        })
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

  const { prescriptionsParEtape, resultatsParEtape, resultatsParPrescription } = useMemo(() => {
    const pe = new Map<number, Prescription[]>();
    const re = new Map<number, ResultatParaclinique[]>();
    const etapes = parcours?.etapes ?? [];
    const rattaches = new Map<string, ResultatParaclinique[]>();
    const dejaPlaces = new Set<string>();
    for (const p of prescriptions ?? []) {
      etapeDuJour(etapes, p.createdAt, pe, p);
      const rs = resultatsDePrescription(p, tousResultats);
      rattaches.set(`${p._type}-${p.id}`, rs);
      for (const r of rs) dejaPlaces.add(String(r.id));
    }
    // Les résultats déjà affichés sous leur prescription ne sont pas répétés.
    for (const r of resultats ?? []) {
      if (!dejaPlaces.has(String(r.id))) etapeDuJour(etapes, r.dateDemande ?? r.dateResultat, re, r);
    }
    return { prescriptionsParEtape: pe, resultatsParEtape: re, resultatsParPrescription: rattaches };
  }, [parcours, prescriptions, resultats, tousResultats]);


  // Sans CHU connu, le dossier patient ne peut pas être lu : pas d'attente de résultats.
  const chargementAnnexes = prescriptions === null || (Boolean(chuId) && resultats === null);

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-500">
        {parcours.etapes.length} étape{parcours.etapes.length > 1 ? "s" : ""} dans cette prise en charge
        {" "}({dateFr(faiteLe(parcours.etapes[0]))} → {dateFr(faiteLe(parcours.etapes[parcours.etapes.length - 1]))}).
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
          const selection = e.id === selectionId;
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
                  {e.dateRealisation ? `Faite le ${dateHeureFr(e.dateRealisation)}` : `${dateFr(e.date)} — ${e.heure}`}
                  {e.dateRealisation && jour(e.dateRealisation) !== jour(e.date) ? ` (prévue le ${dateFr(e.date)})` : ""}
                  {e.medecinNom ? ` · Dr ${e.medecinNom}` : ""}
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Statut : {libelleStatut(e.statut)}
                {e.urgence ? " · Urgence" : ""}
                {e.arriveeAccueilAt ? ` · arrivé à ${dateHeureFr(e.arriveeAccueilAt)}` : ""}
              </p>

              <Champ titre="Motif" valeur={e.motif} />

              <Bloc titre="Observation médicale">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Champ titre="Suspicion diagnostique" valeur={obs?.diagnosticSuspicion} />
                  <Champ titre="Diagnostic retenu" valeur={diagnosticRetenuDe(obs)} />
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
                    {presc.map((p) => {
                      const cle = `${p._type}-${p.id}`;
                      const ouvert = detailsOuverts.has(cle);
                      const demandes = demandesDetaillees(p);
                      const champsPrescription = champsLisibles(p);
                      const resultatsP = resultatsParPrescription.get(cle) ?? [];
                      const aDetail = demandes.length > 0 || champsPrescription.length > 0 || Boolean(p.rdvDate);
                      return (
                      <li key={cle} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[12px] font-bold text-slate-800">{TYPES[p._type] ?? p._type}</p>
                          <p className="text-[11px] text-slate-500">
                            {dateHeureFr(p.createdAt)}
                            {p.statut ? ` · ${libelleStatutPrescription(p.statut)}` : ""}
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
                        {aDetail && (
                          <button
                            type="button"
                            onClick={() =>
                              setDetailsOuverts((o) => {
                                const n = new Set(o);
                                if (n.has(cle)) n.delete(cle);
                                else n.add(cle);
                                return n;
                              })
                            }
                            className="mt-2 text-[11px] font-bold text-[#005b82] hover:underline print:hidden"
                          >
                            {ouvert ? "Masquer le détail" : "Voir le détail"}
                          </button>
                        )}
                        {ouvert && (
                          <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-700">
                            {champsPrescription.map((c) => (
                              <p key={c.titre}>
                                <span className="font-bold">{c.titre} : </span>
                                {c.valeur}
                              </p>
                            ))}
                            {p.rdvDate && (
                              <p>
                                <span className="font-bold">Rendez-vous : </span>
                                {dateFr(p.rdvDate)}
                                {p.rdvTime ? ` à ${String(p.rdvTime).slice(0, 5)}` : ""}
                              </p>
                            )}
                            {demandes.map((d, i) => (
                              <div key={i} className="rounded-lg border border-slate-200 bg-white p-2">
                                <p className="font-bold text-slate-800">
                                  {d.titre}
                                  {d.item.statut ? (
                                    <span className="font-normal text-slate-500"> · {libelleStatutPrescription(d.item.statut)}</span>
                                  ) : null}
                                </p>
                                {champsLisibles(d.item, ["type"]).map((c) => (
                                  <p key={c.titre}>
                                    <span className="font-semibold">{c.titre} : </span>
                                    {c.valeur}
                                  </p>
                                ))}
                                {d.item.rdvDate && (
                                  <p>
                                    <span className="font-semibold">Rendez-vous : </span>
                                    {dateFr(d.item.rdvDate)}
                                    {d.item.rdvTime ? ` à ${String(d.item.rdvTime).slice(0, 5)}` : ""}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {resultatsP.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Résultat</p>
                            {resultatsP.map((r) => (
                              <CarteResultat key={r.id} r={r} />
                            ))}
                          </div>
                        )}
                      </li>
                      );
                    })}
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

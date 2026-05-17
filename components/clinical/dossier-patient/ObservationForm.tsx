'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  dossierPatientApi as api,
  isDossierPatientApiConfigured,
} from '@/lib/clinical/dossier-patient-api';
import { ChevronDown, Check, Save } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';
import { cn } from '@/lib/utils';

import {
  AntecedentsPanel,
  antecedentsHasContent,
  defaultAntecedents,
  parseAntecedentsContent,
} from '@/components/clinical/dossier-patient/AntecedentsPanel';

import {
  TraitementEnCoursPanel,
  traitementHasContent,
  defaultTraitementEnCours,
} from '@/components/clinical/dossier-patient/TraitementEnCoursPanel';

import {
  ExamenPhysiquePanel,
  examenPhysiqueHasContent,
  defaultExamenPhysique,
} from '@/components/clinical/dossier-patient/ExamenPhysiquePanel';

import {
  EtatGeneralPanel,
  etatGeneralHasContent,
  defaultEtatGeneral,
} from '@/components/clinical/dossier-patient/EtatGeneralPanel';

import {
  ExamenAppareilPanel,
  examenAppareilHasContent,
  defaultExamenAppareil,
} from '@/components/clinical/dossier-patient/ExamenAppareilPanel';

import {
  ExamensComplementairesPanel,
  examensComplementairesHasContent,
  defaultExamensComplementaires,
} from '@/components/clinical/dossier-patient/ExamensComplementairesPanel';

import {
  DiagnosticPanel,
  diagnosticHasContent,
  defaultDiagnostic,
} from '@/components/clinical/dossier-patient/DiagnosticPanel';


interface Section {
  id: string;
  title: string;
  isOpen: boolean;
  content: any;
}

export interface ObservationPatientInfo {
  nom: string;
  prenom: string;
  dateNaissance: string;
  adresse: string;
  sexe: string;
  profession: string;
  contact: string;
  contactUrgence: string;
}

function isSectionComplete(section: Section, patientInfo: ObservationPatientInfo | null): boolean {
  if (section.id === '01') return !!patientInfo;
  if (section.id === '04') return antecedentsHasContent(section.content);
  if (section.id === '05') return traitementHasContent(section.content);
  if (section.id === '06') return examenPhysiqueHasContent(section.content);
  if (section.id === '07') return etatGeneralHasContent(section.content);
  if (section.id === '08') return examenAppareilHasContent(section.content);
  if (section.id === '09') return examensComplementairesHasContent(section.content);
  if (section.id === '10') return diagnosticHasContent(section.content);

  const c = section.content;
  if (typeof c === 'string') return c.trim().length > 0;
  if (c && typeof c === 'object') return Object.keys(c).length > 0;
  return false;
}

const labelCell: React.CSSProperties = {
  padding: '8px 16px 8px 0',
  width: '28%',
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  verticalAlign: 'top',
};

const valueCell: React.CSSProperties = {
  padding: '8px 8px 8px 0',
  fontSize: 14,
  color: ehr.text,
  fontWeight: 500,
};

const SECTION_DEFINITIONS: { id: string; title: string; defaultOpen?: boolean }[] = [
  { id: '01', title: 'État civil et identification', defaultOpen: true },
  { id: '02', title: 'Motif de consultation' },
  { id: '03', title: 'Histoire de la maladie actuelle' },
  { id: '04', title: 'Antécédents' },
  { id: '05', title: 'Traitements en cours' },
  { id: '06', title: 'Examen physique' },
  { id: '07', title: 'État général et conscience' },
  { id: "08", title: "Examen neurologique (par appareil)" },
  { id: '09', title: 'Examens complémentaires' },
  { id: '10', title: 'Synthèse diagnostique' },
];

function initialSections(): Section[] {
  return SECTION_DEFINITIONS.map((def): Section => {
    const open = def.defaultOpen ?? false;
    if (def.id === "01")
      return { id: def.id, title: def.title, isOpen: true, content: {} };
    if (def.id === "04")
      return { id: def.id, title: def.title, isOpen: open, content: defaultAntecedents() };
    if (def.id === "05")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultTraitementEnCours(),
      };
    if (def.id === "06")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultExamenPhysique(),
      };
    if (def.id === "07")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultEtatGeneral(),
      };
    if (def.id === "08")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultExamenAppareil(),
      };
    if (def.id === "09")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultExamensComplementaires(),
      };
    if (def.id === "10")
      return {
        id: def.id,
        title: def.title,
        isOpen: open,
        content: defaultDiagnostic(),
      };
    return { id: def.id, title: def.title, isOpen: open, content: "" };
  });
}

export function ObservationForm({
  patientId,
  hydratedPatientInfo = null,
}: {
  patientId: string;
  hydratedPatientInfo?: ObservationPatientInfo | null;
}) {
  const [sections, setSections] = useState<Section[]>(() => initialSections());
  const [patientInfo, setPatientInfo] = useState<ObservationPatientInfo | null>(
    hydratedPatientInfo || null,
  );
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [errorPatient, setErrorPatient] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setSections(initialSections());
    setPatientInfo(null);
    setErrorPatient(null);
    setLoadingPatient(false);
    setLastSaved(null);
  }, [patientId]);

  useEffect(() => {
    if (hydratedPatientInfo) {
      setPatientInfo(hydratedPatientInfo);
    }
  }, [hydratedPatientInfo]);

  useEffect(() => {
    if (!patientId || !isDossierPatientApiConfigured() || patientInfo) return;
    const fetchPatient = async () => {
      setLoadingPatient(true);
      setErrorPatient(null);
      try {
        const res = await api.get(`/patients/${patientId}`);
        const data = res.data;

        const pick = (keys: string[]) => {
          for (const k of keys) {
            if (data[k] && typeof data[k] === "string" && data[k].trim()) {
              return data[k].trim();
            }
          }
          return "";
        };

        setPatientInfo({
          nom: pick(["nom", "lastName", "familyName", "name"]),
          prenom: pick(["prenom", "firstName", "givenName"]),
          dateNaissance: pick(["dateNaissance", "birthDate", "date_naissance"]),
          adresse: pick(["adresse", "address"]),
          sexe:
            data.sexe === "M" || data.sexe?.toLowerCase() === "masculin"
              ? "Masculin"
              : data.sexe === "F" ||
                  data.sexe?.toLowerCase() === "féminin" ||
                  data.sexe?.toLowerCase() === "feminin"
                ? "Féminin"
                : data.sexe || "",
          profession: pick(["profession", "job"]),
          contact: pick(["contact", "phone", "telephone", "tel"]),
          contactUrgence: pick(["contactUrgence", "contact_urgence", "urgence"]),
        });
      } catch (error) {
        console.error("Erreur chargement patient:", error);
        setErrorPatient("Impossible de charger les données d'identification du patient.");
      } finally {
        setLoadingPatient(false);
      }
    };
    void fetchPatient();
  }, [patientId, patientInfo]);

  useEffect(() => {
    if (!patientId || !isDossierPatientApiConfigured()) return;
    const fetchObservation = async () => {
      try {
        const res = await api.get(`/patients/${patientId}/observation`);
        const data = res.data?.data || {};
        setSections((prev) =>
          prev.map((section) => {
            const raw =
              data[section.id] !== undefined ? data[section.id] : section.content;

            if (section.id === "04")
              return { ...section, content: parseAntecedentsContent(raw) };
            if (section.id === "05")
              return {
                ...section,
                content: Array.isArray(raw) ? raw : defaultTraitementEnCours(),
              };
            if (section.id === "06")
              return {
                ...section,
                content:
                  typeof raw === "object" && raw !== null
                    ? { ...defaultExamenPhysique(), ...raw }
                    : defaultExamenPhysique(),
              };
            if (section.id === "07")
              return {
                ...section,
                content:
                  typeof raw === "object" && raw !== null
                    ? { ...defaultEtatGeneral(), ...raw }
                    : defaultEtatGeneral(),
              };
            if (section.id === "08")
              return {
                ...section,
                content:
                  typeof raw === "object" && raw !== null
                    ? { ...defaultExamenAppareil(), ...raw }
                    : defaultExamenAppareil(),
              };
            if (section.id === "09")
              return {
                ...section,
                content: Array.isArray(raw) ? raw : defaultExamensComplementaires(),
              };
            if (section.id === "10")
              return {
                ...section,
                content:
                  typeof raw === "object" && raw !== null
                    ? { ...defaultDiagnostic(), ...raw }
                    : defaultDiagnostic(),
              };

            return { ...section, content: raw };
          }),
        );
      } catch (error) {
        console.error("Erreur chargement observation:", error);
      }
    };
    void fetchObservation();
  }, [patientId]);

  const saveObservation = useCallback(async () => {
    if (!patientId || !isDossierPatientApiConfigured()) return;
    setSaving(true);
    try {
      const observationData = sections.reduce(
        (acc, section) => {
          acc[section.id] = section.content;
          return acc;
        },
        {} as Record<string, unknown>,
      );
      await api.put(`/patients/${patientId}/observation`, { data: observationData });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  }, [sections, patientId]);

  useEffect(() => {
    if (!patientId || !isDossierPatientApiConfigured()) return;
    const timer = setTimeout(() => {
      void saveObservation();
    }, 1000);
    return () => clearTimeout(timer);
  }, [sections, patientId, saveObservation]);

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id === id) {
          return { ...section, isOpen: !section.isOpen };
        }
        return { ...section, isOpen: false };
      })
    );
  };

  const updateSectionContent = (id: string, content: any) => {
    setSections(prev =>
      prev.map(section => (section.id === id ? { ...section, content } : section))
    );
  };

  const iconStroke = 1.75;

  return (
    <div className="font-sans">
      {sections.map((section) => {
        const complete = isSectionComplete(section, patientInfo);
        return (
          <div
            key={section.id}
            className="mb-2.5 overflow-hidden rounded-xl border bg-white"
            style={{
              borderColor: ehr.border,
              boxShadow: ehr.shadowCard,
            }}
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex w-full cursor-pointer items-center gap-4 border-none bg-white px-5 py-4 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[13px] font-bold text-white">
                {section.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold" style={{ color: ehr.text }}>
                  {section.title}
                </div>
                {!section.isOpen ? (
                  <p className="mt-1 text-[12px] font-normal text-slate-500">
                    Cliquez pour ouvrir
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {complete ? (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: ehr.success }}
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border-2 border-slate-300 bg-white"
                    aria-hidden
                  />
                )}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                    section.isOpen ? "rotate-180" : "rotate-0",
                  )}
                  strokeWidth={iconStroke}
                />
              </div>
            </button>
            {section.isOpen && (
              <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${ehr.borderSoft}` }}>
                {section.id === '01' && loadingPatient && (
                  <div className="animate-pulse space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-3/4 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-3/4 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-5/6 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/3 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-2/3 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-1/4 rounded bg-slate-200"></div>
                        <div className="h-4.5 w-1/2 rounded bg-slate-100"></div>
                      </div>
                    </div>
                  </div>
                )}

                {section.id === '01' && errorPatient && (
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] text-red-700">
                    <span className="text-base" aria-hidden>⚠️</span>
                    <div className="flex-1 font-semibold">{errorPatient}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setPatientInfo(null);
                        setErrorPatient(null);
                      }}
                      className="cursor-pointer rounded bg-red-100 px-3 py-1.5 text-[12px] font-bold text-red-800 transition hover:bg-red-200"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {section.id === '01' && !loadingPatient && !errorPatient && !patientInfo && (
                  <div className="text-center py-6 text-slate-500 text-[14px] font-medium">
                    Aucune donnée d'identification disponible pour ce patient.
                  </div>
                )}

                {section.id === '01' && !loadingPatient && !errorPatient && patientInfo && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={labelCell}>Nom de famille</td>
                        <td style={valueCell}>{patientInfo.nom}</td>
                        <td style={labelCell}>Prénom(s)</td>
                        <td style={valueCell}>{patientInfo.prenom}</td>
                      </tr>
                      <tr>
                        <td style={labelCell}>Date de naissance</td>
                        <td style={valueCell}>
                          {patientInfo.dateNaissance
                            ? new Date(patientInfo.dateNaissance).toLocaleDateString('fr-FR')
                            : ''}
                        </td>
                        <td style={labelCell}>Adresse</td>
                        <td style={valueCell}>{patientInfo.adresse}</td>
                      </tr>
                      <tr>
                        <td style={labelCell}>Sexe</td>
                        <td style={valueCell}>{patientInfo.sexe}</td>
                        <td style={labelCell}>Profession</td>
                        <td style={valueCell}>{patientInfo.profession}</td>
                      </tr>
                      <tr>
                        <td style={labelCell}>Contact patient</td>
                        <td style={valueCell}>{patientInfo.contact}</td>
                        <td style={labelCell}>Contact urgence</td>
                        <td style={valueCell}>{patientInfo.contactUrgence}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
                
                {section.id === '02' && (
                  <textarea
                    value={typeof section.content === "string" ? section.content : ""}
                    onChange={e => updateSectionContent('02', e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', padding: 12, border: `1px solid ${ehr.border}`, borderRadius: 6,
                      fontFamily: 'inherit', fontSize: 14, backgroundColor: ehr.inputBg, color: ehr.text, resize: 'vertical'
                    }}
                    placeholder="Saisir motif de consultation..."
                  />
                )}
                
                {section.id === '03' && (
                  <textarea
                    value={typeof section.content === "string" ? section.content : ""}
                    onChange={e => updateSectionContent('03', e.target.value)}
                    rows={6}
                    style={{
                      width: '100%', padding: 12, border: `1px solid ${ehr.border}`, borderRadius: 6,
                      fontFamily: 'inherit', fontSize: 14, backgroundColor: ehr.inputBg, color: ehr.text, resize: 'vertical'
                    }}
                    placeholder="Saisir histoire de la maladie..."
                  />
                )}

                {section.id === '04' && (
                  <AntecedentsPanel
                    value={section.content}
                    onChange={next => updateSectionContent('04', next)}
                  />
                )}

                {section.id === '05' && (
                  <TraitementEnCoursPanel
                    value={section.content}
                    onChange={next => updateSectionContent('05', next)}
                  />
                )}

                {section.id === '06' && (
                  <ExamenPhysiquePanel
                    value={section.content}
                    onChange={next => updateSectionContent('06', next)}
                  />
                )}

                {section.id === '07' && (
                  <EtatGeneralPanel
                    value={section.content}
                    onChange={next => updateSectionContent('07', next)}
                  />
                )}

                {section.id === '08' && (
                  <ExamenAppareilPanel
                    value={section.content}
                    onChange={next => updateSectionContent('08', next)}
                  />
                )}

                {section.id === '09' && (
                  <ExamensComplementairesPanel
                    value={section.content}
                    onChange={next => updateSectionContent('09', next)}
                  />
                )}

                {section.id === '10' && (
                  <DiagnosticPanel
                    value={section.content}
                    onChange={next => updateSectionContent('10', next)}
                  />
                )}

              </div>
            )}
          </div>
        );
      })}
      <div
        className="mt-3.5 flex items-center justify-between text-[12px]"
        style={{ color: ehr.textMuted }}
      >
        <div className="flex items-center gap-2">
          {isDossierPatientApiConfigured() ? (
            <>
              {saving ? <Save className="h-3.5 w-3.5" strokeWidth={iconStroke} /> : null}
              {saving
                ? "Sauvegarde…"
                : lastSaved
                  ? `Dernière sauvegarde : ${lastSaved.toLocaleTimeString("fr-FR")}`
                  : "Prêt"}
            </>
          ) : (
            <span>
              Sauvegarde cloud désactivée (définir{" "}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_DOSSIER_API_URL</code>).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

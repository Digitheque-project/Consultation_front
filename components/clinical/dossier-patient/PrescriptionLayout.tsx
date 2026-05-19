"use client";
import { useState } from 'react';

export type Section =
  | 'med' | 'nm' | 'surv' | 'trans'
  | 'labo' | 'imag' | 'eeg' | 'kine' | 'endo' | 'dial' | 'ana'
  | 'bloc' | 'para' | 'hist';

interface PrescriptionLayoutProps {
  patient?: {
    nom?: string; prenom?: string;
    dateNaissance?: string;
    idPermanent?: string;
    allergies?: string[];
    sexe?: string;
    categorie?: string;
    groupeSanguin?: string;
    chambre?: string;
    lit?: string;
    service?: string;
    typeHospital?: string;
  };
  prescripteur?: { id?: string; nom?: string; prenoms?: string; poste?: string; service?: string };
  children: (activeSection: Section) => React.ReactNode;
}

function calcAge(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const diff = Date.now() - new Date(dateNaissance).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PrescriptionLayout({ patient, prescripteur, children }: PrescriptionLayoutProps) {
  const [activeSection, setActiveSection] = useState<Section>('med');
  const [activeParaSection, setActiveParaSection] = useState<Section>('labo');

  const mainItems = [
    {id:'med',  icon:'medication',       label:'Médicamenteuse'},
    {id:'nm',   icon:'self_care',        label:'Non Médicamenteuse'},
    {id:'surv', icon:'monitor_heart',    label:'Surveillance'},
    {id:'trans',icon:'bloodtype',        label:'Transfusion'},
    {id:'para', icon:'biotech',          label:'Para-clinique'},
    {id:'bloc', icon:'medical_services', label:'Bloc Opératoire'},
    {id:'hist', icon:'history',          label:'Historique'},
  ];

  const paraItems = [
    {id:'labo', icon:'science',    label:'Laboratoire'},
    {id:'imag', icon:'radiology',  label:'Imagerie'},
    {id:'eeg',  icon:'neurology',  label:'EEG'},
    {id:'kine', icon:'exercise',   label:'Kinésithérapie'},
    {id:'endo', icon:'visibility', label:'Endoscopie'},
    {id:'dial', icon:'water_full', label:'Dialyse'},
    {id:'ana',  icon:'biotech',    label:'Anapath'},
  ];

  const currentSection = activeSection === 'para' ? activeParaSection : activeSection;
  const initiale = prescripteur?.nom?.[0]?.toUpperCase() || 'N';
  const age = calcAge(patient?.dateNaissance);
  const sexeLabel = patient?.sexe === 'M' ? 'Masculin' : patient?.sexe === 'F' ? 'Féminin' : patient?.sexe;
  const chambreLabel = [patient?.chambre, patient?.lit].filter(Boolean).join(' — ');

  return (
    <div style={{display:'flex', flexDirection:'column', flex:1, overflow:'hidden'}}>
      {/* NAVIGATION PRINCIPALE */}
      <div style={{background:'var(--card)', borderBottom:'1px solid var(--bdr)', flexShrink:0, padding:'8px 12px'}}>
        <div style={{display:'flex', overflowX:'auto', gap:6, alignItems:'flex-end'}}>

          {/* Groupe Prescriptions */}
          <div style={{display:'flex', flexDirection:'column', gap:3, flexShrink:0}}>
            <div style={{display:'flex', gap:2, background:'var(--card)', borderRadius:10, padding:'3px', border:'1px solid var(--bdr)'}}>
              {mainItems.filter((i:{id:string}) => ['med','nm','surv','trans'].includes(i.id)).map((item:{id:string,icon:string,label:string}) => {
                const isActive = activeSection === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveSection(item.id as Section)} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
                    background: isActive ? 'var(--navy,#1e3a5f)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--txt2,#6b7280)',
                    fontWeight: isActive ? 700 : 500, fontSize:11,
                    whiteSpace:'nowrap', transition:'all .15s',
                  }}>
                    <span className="ms" style={{fontSize:18}}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{width:1, height:52, background:'var(--bdr)', flexShrink:0}} />

          {/* Groupe Para-clinique */}
          <div style={{display:'flex', flexDirection:'column', gap:3, flexShrink:0}}>
            <div style={{display:'flex', gap:2, background:'var(--card)', borderRadius:10, padding:'3px', border:'1px solid var(--bdr)'}}>
              {mainItems.filter((i:{id:string}) => i.id === 'para').map((item:{id:string,icon:string,label:string}) => {
                const isActive = activeSection === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveSection(item.id as Section)} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    padding:'7px 20px', borderRadius:8, border:'none', cursor:'pointer',
                    background: isActive ? 'var(--navy,#1e3a5f)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--txt2,#6b7280)',
                    fontWeight: isActive ? 700 : 500, fontSize:11,
                    whiteSpace:'nowrap', transition:'all .15s',
                  }}>
                    <span className="ms" style={{fontSize:18}}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{width:1, height:52, background:'var(--bdr)', flexShrink:0}} />

          {/* Groupe Bloc + Historique */}
          <div style={{display:'flex', flexDirection:'column', gap:3, flexShrink:0}}>
            <div style={{display:'flex', gap:2, background:'var(--card)', borderRadius:10, padding:'3px', border:'1px solid var(--bdr)'}}>
              {mainItems.filter((i:{id:string}) => ['bloc','hist'].includes(i.id)).map((item:{id:string,icon:string,label:string}) => {
                const isActive = activeSection === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveSection(item.id as Section)} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
                    background: isActive ? 'var(--navy,#1e3a5f)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--txt2,#6b7280)',
                    fontWeight: isActive ? 700 : 500, fontSize:11,
                    whiteSpace:'nowrap', transition:'all .15s',
                  }}>
                    <span className="ms" style={{fontSize:18}}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* SOUS-NAVIGATION PARA-CLINIQUE */}
      {activeSection === 'para' && (
        <div style={{background:'var(--card)', borderBottom:'1px solid var(--bdr)', flexShrink:0, padding:'6px 12px'}}>
          <div style={{display:'flex', overflowX:'auto', gap:4, alignItems:'center'}}>
            <span style={{fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--txt3)', flexShrink:0, marginRight:4}}>Examens :</span>
            {paraItems.map((item:{id:string,icon:string,label:string}) => {
              const isActive = activeParaSection === item.id;
              return (
                <button key={item.id} onClick={() => setActiveParaSection(item.id as Section)} style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'5px 12px', borderRadius:20,
                  border: '1px solid var(--bdr)',
                  cursor:'pointer',
                  background: isActive ? 'var(--navy,#1e3a5f)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--txt2,#6b7280)',
                  fontWeight: isActive ? 700 : 500, fontSize:11,
                  whiteSpace:'nowrap', transition:'all .15s', flexShrink:0,
                }}>
                  <span className="ms" style={{fontSize:15}}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENU */}
      <div style={{flex:1, overflowY:'auto'}}>
        <div style={{maxWidth:'100%', margin:'0 auto', padding:'8px 12px'}}>
          {children(currentSection)}
        </div>
      </div>

    </div>
  );
}

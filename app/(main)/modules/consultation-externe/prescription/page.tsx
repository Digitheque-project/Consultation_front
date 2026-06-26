'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWaitingConsultations } from '@/hooks/use-consultations';
import { consultationApi, type ConsultationApi } from '@/lib/api/consultation';
import { useAuth } from '@/context/AuthContext';

type Appointment = {
  id: number;
  t: string;
  n: string;
  a: string;
  g: string;
  s: string;
  u?: number;
  motif?: string;
  coverage?: string;
  idNumber?: string;
  profession?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
};

export default function PrescriptionPage() {
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<Appointment | null>(null);
  const { medecin } = useAuth();

  const { data: consultations = [], isLoading: loading, error } = useWaitingConsultations();

  const appointments: Appointment[] = useMemo(() => {
    return consultations.map((consultation) => ({
      id: consultation.id,
      t: consultation.heure,
      n: consultation.patient?.displayName ?? `Patient #${consultation.patientId}`,
      a: new Date(consultation.date).toLocaleDateString('fr-FR'),
      g: consultation.urgence ? 'Urgence' : 'Normal',
      s: consultation.statut?.toUpperCase().replace(/_/g, ' ') || 'EN ATTENTE',
      u: consultation.urgence ? 1 : undefined,
      motif: consultation.observation?.diagnostic ?? '',
    }));
  }, [consultations]);

  const handleStart = async (appt: Appointment) => {
    try {
      // Récupérer les détails complets de la consultation pour obtenir patientId
      const consultationDetails = await consultationApi.getConsultationById(appt.id);

      // Utiliser la route de redirection centralisée
      const redirectResponse = await fetch('/api/redirect/traitement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId: appt.id,
          patientId: consultationDetails.patientId,
          from: 'prescription'
        }),
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        router.push(data.redirectUrl);
      } else {
        console.error('Erreur lors de la redirection');
        // Fallback direct en cas d'erreur
        router.push(`/modules/consultation-externe/traitement?id=${appt.id}`);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      // Fallback direct en cas d'erreur
      router.push(`/modules/consultation-externe/traitement?id=${appt.id}`);
    }
  };

  const handleOpenPatientInfo = (appt: Appointment) => {
    setPatientInfo(appt);
  };

  const handleClosePatientInfo = () => {
    setPatientInfo(null);
  };

  const doctorName = medecin ? `Dr. ${medecin.prenom} ${medecin.nom}` : 'Dr. connecté';
  const specialtyName = medecin?.specialite ? `(${medecin.specialite})` : '';

  return (
    <div className='flex flex-1 overflow-hidden gap-4 p-4'>
      <div className='fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md md:w-full pointer-events-none'>
        <div className='pointer-events-auto ml-auto'>
        </div>
      </div>

      <main className='flex-1 overflow-y-auto p-8 bg-white rounded-2xl shadow-sm'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h2 className='text-4xl font-bold text-slate-800 mb-2'>Mes consultations du jour</h2>
            <p className='text-slate-400 font-medium'>{doctorName} {specialtyName}</p>
          </div>
          <Link href='/modules/consultation-externe/planning-complet' className='rounded-full bg-blue-700 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-800'>
            Planning complet
          </Link>
        </div>
        {loading ? (
          <div className='p-6 text-slate-600'>Chargement des consultations...</div>
        ) : error ? (
          <div className='p-6 bg-red-50 text-red-700 rounded-lg'>Erreur de chargement des données.</div>
        ) : appointments.length === 0 ? (
          <div className='p-6 bg-blue-50 text-blue-700 rounded-lg'>Aucune consultation en attente pour le moment.</div>
        ) : (
          <div className='space-y-6'>
            {appointments.map(a => (
              <div key={a.id} className={`relative border rounded-3xl flex items-center p-6 ${a.u ? "border-slate-100 shadow-lg" : "border-slate-100 shadow-md"}`}>
                {a.u && <div className='w-1.5 h-32 bg-red-600 rounded-r-full absolute left-0'></div>}
                <div className='flex-1 flex items-center px-8'>
                  <div className='w-24 text-center mr-8 border-r border-slate-100 pr-8'>
                    <p className='text-2xl font-bold text-slate-800'>{a.t}</p>
                    <p className='text-xs font-bold text-slate-400 uppercase'>En attente</p>
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-1'>
                      <h3 className='text-2xl font-bold text-slate-800'>{a.n}</h3>
                      <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${a.s === "URGENCE" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>{a.s}</span>
                    </div>
                    <p className='text-slate-400 text-sm font-medium'>{a.a} • {a.g}</p>
                    {a.motif ? <p className='text-slate-500 text-sm mt-1'>{a.motif}</p> : null}
                  </div>
                  <div className='text-right'>
                    <button onClick={() => handleStart(a)} className='bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-sm mb-2 hover:bg-blue-800'>Commencer</button>
                    <button onClick={() => handleOpenPatientInfo(a)} className='block text-blue-700 text-sm font-bold hover:underline'>Infos patient</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {patientInfo ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4'>
          <div className='relative w-full max-w-3xl rounded-[32px] bg-white shadow-[0_32px_120px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 border border-slate-100 max-h-[calc(100vh-4rem)] overflow-hidden'>
            <div className='flex h-full flex-col'>
              <div className='flex flex-col gap-6 border-b border-slate-200 bg-white px-8 py-8 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold mb-2'>Informations du patient</p>
                  <div className='flex flex-wrap items-center gap-3'>
                    <h2 className='text-3xl font-extrabold text-slate-900'>{patientInfo.n}</h2>
                    {patientInfo.coverage ? (
                      <span className='rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-700'>{patientInfo.coverage}</span>
                    ) : null}
                  </div>
                  <div className='mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500'>
                    <span>{patientInfo.a}</span>
                    <span className='inline-flex h-1 w-1 rounded-full bg-slate-300' />
                    <span>{patientInfo.g}</span>
                  </div>
                </div>
                <button onClick={handleClosePatientInfo} className='rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'>
                  <span className='text-xl leading-none'>×</span>
                </button>
              </div>

              <div className='min-h-0 overflow-y-auto bg-slate-50 px-8 py-6'>
                <div className='grid gap-6 lg:grid-cols-2'>
                  <div className='rounded-[28px] bg-white p-6 shadow-sm border border-slate-200'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Nom complet</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.n}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Sexe</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.g}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Date de naissance</p>
                        <p className='text-sm font-semibold text-slate-900'>12/05/1983</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>CIN / ID</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.idNumber ?? '-'}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Profession</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.profession ?? '-'}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Téléphone</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.phone ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className='rounded-[28px] bg-white p-6 shadow-sm border border-slate-200'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Adresse</p>
                        <p className='text-sm font-semibold text-slate-900'>{patientInfo.address ?? '-'}</p>
                      </div>
                      <div>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Contact d'urgence</p>
                        <p className='text-sm font-semibold text-blue-700'>{patientInfo.emergencyContact ?? '-'}</p>
                      </div>
                      <div className='sm:col-span-2'>
                        <p className='text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold mb-2'>Motif de consultation</p>
                        <div className='rounded-3xl bg-slate-100 p-4 text-sm text-slate-600'>"{patientInfo.motif ?? 'Aucun motif renseigné.'}"</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-4 border-t border-slate-200 bg-white px-8 py-6 sm:flex sm:items-center sm:justify-between sm:space-y-0'>
                <button onClick={handleClosePatientInfo} className='w-full rounded-full border border-slate-200 bg-slate-50 px-8 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:w-auto'>Fermer</button>
                <button onClick={() => {
                  if (!patientInfo) return;
                  handleStart(patientInfo);
                  handleClosePatientInfo();
                }} className='w-full rounded-full bg-blue-700 px-8 py-3 text-sm font-bold text-white transition hover:bg-blue-800 sm:w-auto'>Commencer la consultation</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

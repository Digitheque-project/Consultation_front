"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Search, BarChart2, ClipboardList, CheckCircle } from "lucide-react";
import { useNotificationStore, EnrichedNotification, PatientInfo } from "@/stores/notification-store";
import { hospitalisationApi, StatutDemande } from "@/lib/api/instances/hospitalisation";
import { patientApi } from "@/lib/api/instances/patient";
import { useTenant } from "@/hooks/use-tenant";
import { NotificationCard } from "@/components/notification/NotificationCard";
import { NotificationSkeleton } from "@/components/notification/NotificationSkeleton";
import { cn } from "@/lib/utils";

export default function NotificationPage() {
  const { notifications, setNotifications, resetUnread } = useNotificationStore();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Toutes");

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
    // Reset unread count when viewing the page
    resetUnread();
  }, [resetUnread]);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await hospitalisationApi.getActives(50);
        const activeHospis = response.data;

        // Fetch patient info for each hospitalisation
        const enriched = await Promise.all(
          activeHospis.map(async (h) => {
            let patient = null;
            try {
              const pResp = await patientApi.getById(h.patientId, tenantId);
              patient = toPatientInfo(pResp.data, h.patientId);
            } catch (e) {
              console.error(`Failed to fetch patient ${h.patientId}`, e);
            }
            return {
              ...h,
              patient: patient || undefined,
              receivedAt: new Date(h.dateEntrer).getTime(),
            } as EnrichedNotification;
          })
        );

        setNotifications(enriched);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, setNotifications]);

  const showSkeleton = loading && notifications.length === 0;

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => {
        // Filter by status
        const matchesStatus = 
          activeFilter === "Toutes" ||
          (activeFilter === "En attente" && n.statusDemande === StatutDemande.EN_ATTENTE) ||
          (activeFilter === "Acceptées" && n.statusDemande === StatutDemande.ACCEPTE) ||
          (activeFilter === "Refusées" && n.statusDemande === StatutDemande.REFUSE);

        if (!matchesStatus) return false;

        // Filter by search query
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const patientName = `${n.patient?.nom || ""} ${n.patient?.prenom || ""}`.toLowerCase();
        return (
          patientName.includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.patientId.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.receivedAt - a.receivedAt);
  }, [notifications, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      pending: notifications.filter((n) => n.statusDemande === StatutDemande.EN_ATTENTE).length,
      accepted: notifications.filter((n) => n.statusDemande === StatutDemande.ACCEPTE).length,
      refused: notifications.filter((n) => n.statusDemande === StatutDemande.REFUSE).length,
    };
  }, [notifications]);

  return (
    <div className="min-h-full bg-[#F8F9FB] p-6 lg:p-8 xl:p-10 font-sans">
      <h1 className="text-2xl lg:text-[28px] font-extrabold text-[#111827] mb-8 tracking-tight">
        Notifications
      </h1>

      {/* Top Bar: Search and Tabs */}
      <div className="flex items-center bg-[#F1F5F9] p-1.5 rounded-[16px] w-fit mb-8 shadow-sm">
        <div className="relative w-[320px] mr-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou ID patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[12px] text-[13px] font-medium border-none focus:outline-none focus:ring-2 focus:ring-[#006A8C] text-gray-900 bg-white shadow-[0px_2px_6px_rgba(0,0,0,0.02)] placeholder:text-gray-400"
          />
        </div>
        {[ "Toutes", "En attente", "Acceptées", "Refusées" ].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-6 py-2.5 text-[13px] font-bold rounded-[12px] transition-all flex items-center gap-2.5",
              activeFilter === filter 
                ? "bg-white text-[#006A8C] shadow-[0px_2px_8px_rgba(0,0,0,0.06)]" 
                : "text-gray-500 hover:bg-gray-200/50"
            )}
          >
            {filter}
            {filter === "En attente" && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>}
            {filter === "Acceptées" && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>}
            {filter === "Refusées" && <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"></span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Notification List */}
        <div className="xl:col-span-8 2xl:col-span-8 flex flex-col gap-5">
          {showSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => <NotificationSkeleton key={i} />)
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-[20px] p-20 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-extrabold text-lg">Aucune notification</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => <NotificationCard key={n.id} notification={n} />)
          ) : (
            <div className="bg-white rounded-[20px] p-20 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-900 font-extrabold text-lg">Aucune hospitalisation ne correspond à vos critères.</p>
            </div>
          )}
        </div>

        {/* Right Column: Service Overview */}
        <div className="xl:col-span-4 2xl:col-span-4 sticky top-6">
          <div className="bg-white rounded-[24px] p-7 shadow-[0px_4px_24px_rgba(0,0,0,0.03)] border border-[#F1F5F9]">
            <div className="flex items-center gap-3.5 mb-10">
              <div className="w-9 h-9 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#006A8C]">
                <BarChart2 className="w-[18px] h-[18px] stroke-[2.5]" />
              </div>
              <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">Aperçu du service</h2>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-3.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.1em]">Capacité des lits</span>
                <span className="text-[18px] font-extrabold text-[#006A8C]">28 <span className="text-gray-300 font-bold">/ 32</span></span>
              </div>
              
              <div className="h-[7px] w-full bg-gray-100 rounded-full mb-4 flex overflow-hidden">
                <div className="h-full bg-[#0EA5E9] rounded-full" style={{ width: '87.5%' }}></div>
              </div>
              
              <div className="flex justify-between items-center text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></span>
                  <span className="text-gray-600">Occupés</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  <span className="text-gray-400">Disponibles (4)</span>
                </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-gray-100 mb-7"></div>

            <div className="mb-8">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.1em] mb-5">Résumé des notifications</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#0EA5E9]">
                    <ClipboardList className="w-[18px] h-[18px] stroke-[2.5]" />
                  </div>
                  <span className="text-[13.5px] font-extrabold text-gray-700 pt-0.5">{stats.pending} Dossiers en attente</span>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#10B981]">
                    <CheckCircle className="w-[20px] h-[20px] fill-[#10B981] text-white stroke-[2]" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[13.5px] font-extrabold text-gray-700">{stats.accepted} Dossiers acceptés</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">En attente d'attribution chambre / Lit</p>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-[12px] border-[1.5px] border-[#006A8C]/20 text-[#006A8C] text-[13px] font-bold hover:bg-[#F0F7FF] transition-colors">
              Générer le rapport quotidien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

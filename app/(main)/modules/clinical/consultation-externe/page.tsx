"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarX, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data
const patients = [
  {
    id: 1,
    time: "08:45",
    status: "EN ATTENTE",
    name: "Mbola Razafy",
    urgency: "URGENCE",
    details: "42 ans • Femme",
    action: "start",
  },
  {
    id: 2,
    time: "09:30",
    status: "EN ATTENTE",
    name: "Sitraka Rakoto",
    urgency: "EN ATTENTE",
    details: "28 ans • Homme",
    action: "start",
  },
  {
    id: 3,
    time: "09:40",
    status: "EN ATTENTE",
    name: "Parfait Jean",
    urgency: "EN ATTENTE",
    details: "28 ans • Homme",
    action: "start",
  },
  {
    id: 4,
    time: "09:55",
    status: "EN ATTENTE",
    name: "Mamy Thor",
    urgency: "EN ATTENTE",
    details: "28 ans • Homme",
    action: "start",
  },
  {
    id: 5,
    time: "08:00",
    status: "EFFECTUÉ",
    name: "Faniry Lalao",
    urgency: "TERMINÉ",
    details: "54 ans • Femme",
    action: "done",
  },
];

export default function ConsultationExternePage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-slate-50 p-6 md:p-8 space-y-6 lg:space-y-0 lg:space-x-8 flex-col lg:flex-row">
      {/* Left Column: Consultation List */}
      <div className="flex-1 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes consultations du jour</h1>
          <p className="text-slate-500 font-medium">Dr. Jean Pierre (Chirurgie Viscérale)</p>
        </div>

        <div className="space-y-4">
          {patients.map((patient) => (
            <Card key={patient.id} className="relative overflow-hidden border-none shadow-sm rounded-2xl">
              {/* Left Color Strip for Urgency */}
              {patient.urgency === "URGENCE" && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600"></div>
              )}
              
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                  {/* Time & Status */}
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className={cn(
                      "text-2xl font-bold",
                      patient.status === "EFFECTUÉ" ? "text-slate-300" : "text-slate-900"
                    )}>
                      {patient.time}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider text-center leading-tight">
                      {patient.status === "EN ATTENTE" ? "EN\nATTENTE" : "EFFECTUÉ"}
                    </span>
                  </div>

                  {/* Vertical Divider */}
                  <div className="hidden md:block w-px h-12 bg-slate-100"></div>

                  {/* Patient Info */}
                  <div className="flex-1 flex flex-col items-center md:items-start w-full text-center md:text-left">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={cn(
                        "text-lg font-bold",
                        patient.status === "EFFECTUÉ" ? "text-slate-500" : "text-slate-900"
                      )}>
                        {patient.name}
                      </span>
                      {patient.urgency === "URGENCE" && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 rounded-md font-bold text-[10px] uppercase tracking-wider">
                          Urgence
                        </Badge>
                      )}
                      {patient.urgency === "EN ATTENTE" && (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-2 rounded-md font-bold text-[10px] uppercase tracking-wider">
                          En attente
                        </Badge>
                      )}
                      {patient.urgency === "TERMINÉ" && (
                        <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 border-none px-2 rounded-md font-bold text-[10px] uppercase tracking-wider">
                          Terminé
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-400">
                      {patient.details}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                    {patient.action === "start" ? (
                      <>
                        <Button className="w-full md:w-auto bg-[#005b82] hover:bg-[#004a6b] text-white rounded-lg px-6 py-5 h-auto font-semibold">
                          Commencer la<br/>consultation
                        </Button>
                        <Button variant="ghost" className="text-[#005b82] hover:text-[#004a6b] hover:bg-transparent font-bold">
                          Infos patient
                        </Button>
                      </>
                    ) : (
                      <Button disabled className="w-full md:w-auto bg-slate-100 text-slate-400 hover:bg-slate-100 rounded-lg px-8 py-5 h-auto font-semibold">
                        Consultation<br/>terminée
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Column: Overview */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="sticky top-8 space-y-8">
          
          {/* Stats Widget */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[#005b82] font-semibold">
              <Calendar className="w-5 h-5" />
              <span>Vue d'ensemble</span>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider">MON QUOTA AUJOURD'HUI</span>
                <span className="text-sm font-bold text-[#005b82]">7/10</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#005b82] h-full rounded-full" style={{ width: "70%" }}></div>
              </div>

              <div className="flex justify-between mt-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">CONSULTATON<br/>DU JOUR</span>
                  <span className="text-3xl font-bold text-[#005b82]">07</span>
                </div>
                <div className="w-px bg-slate-100 mx-4"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">EFFECTUÉES<br/>&nbsp;</span>
                  <span className="text-3xl font-bold text-emerald-600">04</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Accès rapide</span>
            
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-slate-700 font-semibold hover:bg-slate-100">
                <Calendar className="w-4 h-4 mr-3 text-[#005b82]" />
                Planning complet
              </Button>
              <Button variant="ghost" className="w-full justify-start text-slate-700 font-semibold hover:bg-slate-100">
                <CalendarX className="w-4 h-4 mr-3 text-red-500" />
                Indisponibilité
              </Button>
              <Button variant="ghost" className="w-full justify-start text-slate-700 font-semibold hover:bg-slate-100">
                <ArrowLeftRight className="w-4 h-4 mr-3 text-[#005b82]" />
                Créneau alternatif
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Stethoscope,
  FileText,
  Clipboard,
  Calendar,
  FileCheck,
  TestTube,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getClinicalStats,
  getOperatingRoomPlanning,
  getPrioritizePatients,
  getGuardTeamMembers,
  getQuickAccessActions,
  getProtocolCards,
} from "@/lib/api/instances/clinical";
import type {
  ClinicalStats,
  OperatingRoomPlanning,
  PrioritizePatient,
  GuardTeamMember,
  QuickAccessAction,
  ProtocolCard,
} from "@/types/api";

const iconMap: Record<string, React.ReactNode> = {
  calendar: <Calendar className="w-5 h-5" />,
  document: <FileCheck className="w-5 h-5" />,
  "test-tube": <TestTube className="w-5 h-5" />,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "ongoing":
      return "info";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "Terminé";
    case "ongoing":
      return "En cours";
    case "pending":
      return "En attente";
    default:
      return status;
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case "present":
      return "bg-green-500";
    case "on-call":
      return "bg-yellow-500";
    default:
      return "bg-gray-300";
  }
};

export default function ClinicalDashboard() {
  const [stats, setStats] = useState<ClinicalStats | null>(null);
  const [planning, setPlanning] = useState<OperatingRoomPlanning[]>([]);
  const [priorityPatients, setPriorityPatients] = useState<
    PrioritizePatient[]
  >([]);
  const [guardTeam, setGuardTeam] = useState<GuardTeamMember[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAccessAction[]>([]);
  const [protocols, setProtocols] = useState<ProtocolCard[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          statsData,
          planningData,
          patientsData,
          guardData,
          actionsData,
          protocolsData,
        ] = await Promise.all([
          getClinicalStats(),
          getOperatingRoomPlanning(),
          getPrioritizePatients(),
          getGuardTeamMembers(),
          getQuickAccessActions(),
          getProtocolCards(),
        ]);

        setStats(statsData);
        setPlanning(planningData);
        setPriorityPatients(patientsData);
        setGuardTeam(guardData);
        setQuickActions(actionsData);
        setProtocols(protocolsData);
      } catch (error) {
        console.error("Error loading clinical dashboard data:", error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tableau de Bord Chirurgical
          </h1>
          <p className="text-gray-500 mt-1">Gestion du bloc opératoire</p>
        </div>

        {/* Statistics Section */}
        {stats && (
          <div className="grid grid-cols-3 gap-6">
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Patients hospitalisés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.hospitalized}
                </div>
                <p className="text-xs text-gray-500 mt-1">Actuellement</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Consultation externe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.externalConsultations}
                </div>
                <p className="text-xs text-gray-500 mt-1">Aujourd'hui</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-blue-600" />
                  Contrôle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.controls}
                </div>
                <p className="text-xs text-gray-500 mt-1">En attente</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* Operating Room Planning */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Planning du Bloc Opératoire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Procédure</TableHead>
                        <TableHead>Chirurgien</TableHead>
                        <TableHead>Bloc</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planning.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.time}
                          </TableCell>
                          <TableCell>{item.patientName}</TableCell>
                          <TableCell>{item.procedure}</TableCell>
                          <TableCell>{item.surgeon}</TableCell>
                          <TableCell>{item.room}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(item.status)}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Quick Access */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accès Rapides
              </h3>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-4 px-4 bg-white border-gray-200 hover:bg-blue-50"
                  >
                    <span className="text-blue-600">
                      {iconMap[action.icon] || <AlertCircle className="w-5 h-5" />}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-gray-900">
                        {action.label}
                      </span>
                      {action.description && (
                        <span className="text-xs text-gray-500">
                          {action.description}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Patients */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Patients Prioritaires
              </h3>
              <div className="space-y-4">
                {priorityPatients.map((patient) => (
                  <Card key={patient.id} className="bg-white">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {patient.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {patient.age} ans • {patient.diagnosis}
                          </p>
                        </div>
                        <Badge
                          variant={
                            patient.priority === "high" ? "destructive" : "secondary"
                          }
                        >
                          {patient.priority === "high" ? "Urgent" : "Moyen"}
                        </Badge>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="pink">SCCRE: {patient.sccreScore}</Badge>
                        <Badge variant="success">EVA: {patient.evaScore}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Guard Team */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Équipe de Garde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guardTeam.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">
                          {member.name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusBgColor(
                          member.status
                        )}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.specialty}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Protocols Card */}
            {protocols.length > 0 && (
              <Card className="bg-linear-to-br from-blue-600 to-blue-700 text-white border-0">
                <CardHeader>
                  <CardTitle className="text-lg">{protocols[0].title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-blue-100">
                    {protocols[0].description}
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full bg-white text-blue-600 hover:bg-blue-50"
                  >
                    Consulter
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

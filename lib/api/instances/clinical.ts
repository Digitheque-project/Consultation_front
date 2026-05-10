import {
  ClinicalStats,
  OperatingRoomPlanning,
  PrioritizePatient,
  GuardTeamMember,
  QuickAccessAction,
  ProtocolCard,
} from "@/types/api";

/* eslint-disable no-console */
// Mock data functions - replace with actual API calls when backend is ready
export const getClinicalStats = async (): Promise<ClinicalStats> => {
  // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
  // const response = await api.get('/clinical/stats');
  return {
    hospitalized: 12,
    externalConsultations: 4,
    controls: 8,
  };
};

export const getOperatingRoomPlanning =
  async (): Promise<OperatingRoomPlanning[]> => {
    // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
    // const response = await api.get('/clinical/operating-room-planning');
    return [
      {
        id: "1",
        patientName: "Jean Dupont",
        time: "08:00",
        surgeon: "Dr. Pierre",
        procedure: "Appendicectomie",
        status: "completed",
        room: "Bloc A",
      },
      {
        id: "2",
        patientName: "Marie Martin",
        time: "10:30",
        surgeon: "Dr. Jean Pierre",
        procedure: "Cholécystectomie",
        status: "ongoing",
        room: "Bloc B",
      },
      {
        id: "3",
        patientName: "Paul Vincent",
        time: "14:00",
        surgeon: "Dr. Pierre",
        procedure: "Hernioplastie",
        status: "pending",
        room: "Bloc C",
      },
      {
        id: "4",
        patientName: "Sophie Bernard",
        time: "16:00",
        surgeon: "Dr. Jean Pierre",
        procedure: "Laparoscopie",
        status: "pending",
        room: "Bloc A",
      },
    ];
  };

export const getPrioritizePatients =
  async (): Promise<PrioritizePatient[]> => {
    // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
    // const response = await api.get('/clinical/priority-patients');
    return [
      {
        id: "1",
        name: "Michel Dupont",
        age: 54,
        priority: "high",
        sccreScore: 18,
        evaScore: 7,
        diagnosis: "Infarctus du myocarde",
      },
      {
        id: "2",
        name: "Céline Leclerc",
        age: 38,
        priority: "medium",
        sccreScore: 12,
        evaScore: 5,
        diagnosis: "Pneumonie sévère",
      },
      {
        id: "3",
        name: "Albert Martin",
        age: 72,
        priority: "high",
        sccreScore: 22,
        evaScore: 8,
        diagnosis: "AVC hémorragique",
      },
    ];
  };

export const getGuardTeamMembers = async (): Promise<GuardTeamMember[]> => {
  // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
  // const response = await api.get('/clinical/guard-team');
  return [
    {
      id: "1",
      name: "Dr. Jean Pierre",
      role: "Chirurgien",
      specialty: "Chirurgie générale",
      status: "present",
    },
    {
      id: "2",
      name: "Dr. Sophie Dupont",
      role: "Anesthésiste",
      specialty: "Anesthésiologie",
      status: "present",
    },
    {
      id: "3",
      name: "Infirmier Marc Vincent",
      role: "Infirmier",
      specialty: "Soins intensifs",
      status: "present",
    },
    {
      id: "4",
      name: "Dr. Paul Laurent",
      role: "Chirurgien",
      specialty: "Chirurgie cardiaque",
      status: "on-call",
    },
    {
      id: "5",
      name: "Infirmière Julie Moreau",
      role: "Infirmière",
      specialty: "Bloc opératoire",
      status: "absent",
    },
  ];
};

export const getQuickAccessActions =
  async (): Promise<QuickAccessAction[]> => {
    // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
    // const response = await api.get('/clinical/quick-actions');
    return [
      {
        id: "1",
        label: "Programmer intervention",
        description: "Planifier une nouvelle intervention chirurgicale",
        icon: "calendar",
        color: "blue",
      },
      {
        id: "2",
        label: "Créer Compte-rendu",
        description: "Générer un rapport opératoire",
        icon: "document",
        color: "blue",
      },
      {
        id: "3",
        label: "Demande d'examen",
        description: "Commander des examens complémentaires",
        icon: "test-tube",
        color: "blue",
      },
    ];
  };

export const getProtocolCards = async (): Promise<ProtocolCard[]> => {
  // NOTE: Temporary mock data - will be replaced with actual API call when backend is ready
  // const response = await api.get('/clinical/protocols');
  return [
    {
      id: "1",
      title: "Protocoles Chirurgicaux",
      description: "Accédez à tous les protocoles de chirurgie",
      link: "#",
    },
  ];
};

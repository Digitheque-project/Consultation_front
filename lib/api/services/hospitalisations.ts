import axios from 'axios';

export type HospitalisationCreationPayload = {
  patientId: string;
  serviceId: string;
  dateEntrer: string;
  motifHospitalisation: string;
  type: 'Hospitalisation';
  commentaire: string;
};

const CLINICAL_API_URL = process.env.NEXT_PUBLIC_CLINICAL_API_URL || 'https://hospitalisation-back.onrender.com';

export const fetchActiveHospitalisations = async (): Promise<any[]> => {
  const url = `${CLINICAL_API_URL}/hospitalisations/actives`;
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des hospitalisations actives:', error);
    return [];
  }
};

export const fetchHospitalisationNotifications = async (): Promise<any[]> => {
  try {
    const response = await axios.get(`${CLINICAL_API_URL}/hospitalisations/notifications`);
    return response.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications d\'hospitalisation:', error);
    return [];
  }
};

export const createHospitalisationRequest = async (
  payload: HospitalisationCreationPayload
): Promise<any> => {
  const url = `${CLINICAL_API_URL}/hospitalisations`;
  
  const cleanPayload = payload;
  
  console.log('Envoi demande hospitalisation vers:', url);
  console.log('Payload:', cleanPayload);
  
  try {
    const response = await axios.post(url, cleanPayload, {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    let errorMessage = 'Une erreur est survenue';
    
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        errorMessage = String(data.message || data.error || JSON.stringify(data));
      } else if (error.message) {
        errorMessage = error.message;
      }
      console.error('Erreur HTTP', error.response?.status, ':', errorMessage);
      console.log('Payload envoye:', cleanPayload);
    } else {
      console.error('Erreur lors de la creation:', error);
    }
    
    throw new Error(errorMessage);
  }
};

import axios from 'axios';

export const fetchActiveHospitalisations = async (): Promise<any[]> => {
  const url = `${process.env.CLINICAL_PUBLIC_API_URL}/hospitalisations/actives`;
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.SERVICE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des hospitalisations actives:', error);
    return [];
  }
};
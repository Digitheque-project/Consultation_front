import axios from 'axios';

export type PriseEnCharge = {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchPriseEnCharge(): Promise<PriseEnCharge[]> {
  const response = await axios.get<PriseEnCharge[]>(`${API_URL}/prise-en-charge`);
  return response.data;
}

import axios from 'axios';
import { checkPublicEnv } from '@/lib/env';

export type PriseEnCharge = {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const API_URL = checkPublicEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL);

export async function fetchPriseEnCharge(): Promise<PriseEnCharge[]> {
  const response = await axios.get<PriseEnCharge[]>(`${API_URL}/prise-en-charge`);
  return response.data;
}

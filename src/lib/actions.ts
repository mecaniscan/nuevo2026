'use server';

import { scanDashboard } from '@/ai/flows/dashboard-scanner-flow';
import { DashboardScanInput, DashboardScanOutput } from '@/ai/schemas';

export async function scanDashboardAction(input: DashboardScanInput): Promise<DashboardScanOutput> {
  const result = await scanDashboard(input);
  if (!result) {
    throw new Error('Invalid response from AI scanner.');
  }
  return result;
}

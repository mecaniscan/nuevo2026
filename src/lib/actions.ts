'use server';

import { decodeObdiiError } from '@/ai/flows/obdii-error-decoder';
import { type ObdiiErrorDecoderInput, type ObdiiErrorDecoderOutput } from '@/ai/schemas';
import { scanDashboard } from '@/ai/flows/dashboard-scanner-flow';
import { DashboardScanInput, DashboardScanOutput } from '@/ai/schemas';


export async function decodeObdiiErrorAction(input: ObdiiErrorDecoderInput): Promise<ObdiiErrorDecoderOutput> {
  const result = await decodeObdiiError(input);
  if (!result || !result.code) {
    throw new Error('Invalid response from AI decoder.');
  }
  return result;
}

export async function scanDashboardAction(input: DashboardScanInput): Promise<DashboardScanOutput> {
  const result = await scanDashboard(input);
  if (!result) {
    throw new Error('Invalid response from AI scanner.');
  }
  return result;
}

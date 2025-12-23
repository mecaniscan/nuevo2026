'use server';

/**
 * @fileOverview A flow for scanning a vehicle's dashboard from an image and identifying warning indicators.
 *
 * - `scanDashboard` - A function that takes an image of a car dashboard and returns identified OBD-II warning indicators with details.
 */

import {ai} from '@/ai/genkit';
import { DashboardScanInputSchema, DashboardScanOutputSchema, type DashboardScanInput, type DashboardScanOutput } from '../schemas';

export async function scanDashboard(input: DashboardScanInput): Promise<DashboardScanOutput> {
  return scanDashboardFlow(input);
}

const dashboardScannerPrompt = ai.definePrompt({
  name: 'dashboardScannerPrompt',
  input: {schema: DashboardScanInputSchema},
  output: {schema: DashboardScanOutputSchema},
  prompt: `You are an expert mechanic specializing in vehicle diagnostics.
  Analyze the following image of a car's dashboard. Identify any and all active warning indicators (e.g., Check Engine, ABS, Oil Pressure, etc.).
  
  For each indicator you identify, provide its name, a description of what it means, a list of potential causes, and a list of common solutions or next steps.
  
  If no warning lights are visible or active in the image, return an empty array for the 'indicators' field.

  Image to analyze: {{media url=photoDataUri}}`,
});

const scanDashboardFlow = ai.defineFlow(
  {
    name: 'scanDashboardFlow',
    inputSchema: DashboardScanInputSchema,
    outputSchema: DashboardScanOutputSchema,
  },
  async input => {
    const {output} = await dashboardScannerPrompt(input);
    return output!;
  }
);

import {z} from 'genkit';

export const ObdiiErrorDecoderInputSchema = z.object({
  errorCode: z
    .string()
    .describe('The OBDII error code to decode (e.g., P0171).'),
});

export type ObdiiErrorDecoderInput = z.infer<typeof ObdiiErrorDecoderInputSchema>;

export const ObdiiErrorDecoderOutputSchema = z.object({
  code: z.string().describe('The OBDII error code that was decoded.'),
  description: z.string().describe('A description of the error.'),
  potentialCauses: z.string().describe('Potential causes of the error.'),
  commonSolutions: z.string().describe('Common solutions to resolve the error.'),
});

export type ObdiiErrorDecoderOutput = z.infer<typeof ObdiiErrorDecoderOutputSchema>;


// Schemas for Dashboard Scanning
export const DashboardScanInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a car's dashboard, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type DashboardScanInput = z.infer<typeof DashboardScanInputSchema>;


const IndicatorSchema = z.object({
    name: z.string().describe("The common name of the warning indicator (e.g., 'Check Engine Light', 'Oil Pressure Warning')."),
    description: z.string().describe("A clear and concise description of what the indicator light means."),
    potentialCauses: z.string().describe("A bulleted list of potential causes for this indicator being active."),
    commonSolutions: z.string().describe("A bulleted list of common solutions or next steps to address the issue.")
});

export const DashboardScanOutputSchema = z.object({
  indicators: z.array(IndicatorSchema).describe("An array of all identified warning indicators from the dashboard image. If no indicators are found, return an empty array."),
});

export type DashboardScanOutput = z.infer<typeof DashboardScanOutputSchema>;

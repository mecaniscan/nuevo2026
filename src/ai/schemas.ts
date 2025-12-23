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

'use server';

/**
 * @fileOverview A flow for decoding OBDII error codes and providing information about the error, potential causes, and common solutions.
 *
 * - `decodeObdiiError` - A function that takes an OBDII error code as input and returns a description of the error, potential causes, and common solutions.
 * - `ObdiiErrorDecoderInput` - The input type for the `decodeObdiiError` function.
 * - `ObdiiErrorDecoderOutput` - The return type for the `decodeObdiiError` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ObdiiErrorDecoderInputSchema = z.object({
  errorCode: z
    .string()
    .describe('The OBDII error code to decode (e.g., P0171).'),
});

export type ObdiiErrorDecoderInput = z.infer<typeof ObdiiErrorDecoderInputSchema>;

const ObdiiErrorDecoderOutputSchema = z.object({
  code: z.string().describe('The OBDII error code that was decoded.'),
  description: z.string().describe('A description of the error.'),
  potentialCauses: z.string().describe('Potential causes of the error.'),
  commonSolutions: z.string().describe('Common solutions to resolve the error.'),
});

export type ObdiiErrorDecoderOutput = z.infer<typeof ObdiiErrorDecoderOutputSchema>;

export async function decodeObdiiError(input: ObdiiErrorDecoderInput): Promise<ObdiiErrorDecoderOutput> {
  return decodeObdiiErrorFlow(input);
}

const obdiiErrorDecoderPrompt = ai.definePrompt({
  name: 'obdiiErrorDecoderPrompt',
  input: {schema: ObdiiErrorDecoderInputSchema},
  output: {schema: ObdiiErrorDecoderOutputSchema},
  prompt: `You are an expert mechanic specializing in OBDII error codes.
  Given the following OBDII error code, provide a description of the error, potential causes, and common solutions.
  Error Code: {{{errorCode}}}
  Format your response as a JSON object with the following keys:
  - code: The OBDII error code.
  - description: A description of the error.
  - potentialCauses: Potential causes of the error.
  - commonSolutions: Common solutions to resolve the error.`,
});

const decodeObdiiErrorFlow = ai.defineFlow(
  {
    name: 'decodeObdiiErrorFlow',
    inputSchema: ObdiiErrorDecoderInputSchema,
    outputSchema: ObdiiErrorDecoderOutputSchema,
  },
  async input => {
    const {output} = await obdiiErrorDecoderPrompt(input);
    return output!;
  }
);

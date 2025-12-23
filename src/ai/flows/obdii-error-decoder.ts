'use server';

/**
 * @fileOverview A flow for decoding OBDII error codes and providing information about the error, potential causes, and common solutions.
 *
 * - `decodeObdiiError` - A function that takes an OBDII error code as input and returns a description of the error, potential causes, and common solutions.
 */

import {ai} from '@/ai/genkit';
import { ObdiiErrorDecoderInputSchema, ObdiiErrorDecoderOutputSchema, type ObdiiErrorDecoderInput, type ObdiiErrorDecoderOutput } from '../schemas';

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

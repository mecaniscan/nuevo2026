'use server';

/**
 * @fileOverview Un flujo para decodificar códigos de error OBDII desde una imagen.
 *
 * - `decodeObdiiErrorFromImage` - Una función que toma una imagen como entrada y devuelve la información del código de error.
 * - `ObdiiVisualDecoderInput` - El tipo de entrada para la función `decodeObdiiErrorFromImage`.
 * - `ObdiiVisualDecoderOutput` - El tipo de retorno para la función `decodeObdiiErrorFromImage`.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { decodeObdiiError } from './obdii-error-decoder';
import { ObdiiErrorDecoderOutputSchema, type ObdiiErrorDecoderOutput } from '../schemas';

const ObdiiVisualDecoderInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "Una foto del tablero de un vehículo o un escáner OBD-II, como un URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});

export type ObdiiVisualDecoderInput = z.infer<typeof ObdiiVisualDecoderInputSchema>;

export type { ObdiiErrorDecoderOutput as ObdiiVisualDecoderOutput };

export async function decodeObdiiErrorFromImage(input: ObdiiVisualDecoderInput): Promise<ObdiiErrorDecoderOutput> {
  return decodeObdiiErrorFromImageFlow(input);
}

const obdiiVisualDecoderPrompt = ai.definePrompt({
  name: 'obdiiVisualDecoderPrompt',
  input: { schema: z.object({ imageDataUri: z.string() }) },
  output: { schema: z.object({ errorCode: z.string().describe('El código de error OBD-II encontrado en la imagen. Por ejemplo, P0171.') }) },
  prompt: `Analiza la siguiente imagen de un escáner OBD-II o del tablero de un vehículo. Tu única tarea es identificar y extraer el código de error OBD-II. El código generalmente comienza con una letra (P, B, C, U) seguida de cuatro números. Devuelve solo el código. Si no se puede encontrar un código claro, devuelve "NONE".

Imagen: {{media url=imageDataUri}}`,
});

const decodeObdiiErrorFromImageFlow = ai.defineFlow(
  {
    name: 'decodeObdiiErrorFromImageFlow',
    inputSchema: ObdiiVisualDecoderInputSchema,
    outputSchema: ObdiiErrorDecoderOutputSchema,
  },
  async (input) => {
    const { output: visualOutput } = await obdiiVisualDecoderPrompt({ imageDataUri: input.imageDataUri });

    if (!visualOutput || visualOutput.errorCode === 'NONE') {
        throw new Error('No se pudo encontrar un código de error OBD-II en la imagen.');
    }
    
    const decoderOutput = await decodeObdiiError({ errorCode: visualOutput.errorCode });

    if (!decoderOutput) {
        throw new Error('No se pudo decodificar el código de error extraído.');
    }
    
    return decoderOutput;
  }
);

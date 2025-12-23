'use server';

import { decodeObdiiError } from '@/ai/flows/obdii-error-decoder';
import { decodeObdiiErrorFromImage, type ObdiiVisualDecoderInput } from '@/ai/flows/obdii-visual-decoder';
import { type ObdiiErrorDecoderInput, type ObdiiErrorDecoderOutput } from '@/ai/schemas';


export async function decodeObdiiErrorAction(input: ObdiiErrorDecoderInput): Promise<ObdiiErrorDecoderOutput> {
  const result = await decodeObdiiError(input);
  if (!result || !result.code) {
    throw new Error('Invalid response from AI decoder.');
  }
  return result;
}

export async function decodeObdiiErrorFromImageAction(input: ObdiiVisualDecoderInput): Promise<ObdiiErrorDecoderOutput> {
  const result = await decodeObdiiErrorFromImage(input);
  if (!result || !result.code) {
    throw new Error('Invalid response from AI visual decoder.');
  }
  return result;
}

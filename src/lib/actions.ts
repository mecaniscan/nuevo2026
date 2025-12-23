'use server';

import { decodeObdiiError, type ObdiiErrorDecoderInput } from '@/ai/flows/obdii-error-decoder';

export async function decodeObdiiErrorAction(input: ObdiiErrorDecoderInput) {
  const result = await decodeObdiiError(input);
  if (!result || !result.code) {
    throw new Error('Invalid response from AI decoder.');
  }
  return result;
}

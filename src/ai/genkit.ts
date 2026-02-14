import {genkit, type GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const plugins: GenkitPlugin[] = [];

// Only initialize the Google AI plugin if the API key is available.
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  // In a production environment, this is a server-side error.
  // In development, it's a warning.
  const log = process.env.NODE_ENV === 'production' ? console.error : console.warn;
  log(
    'GEMINI_API_KEY environment variable not set. GenAI features will be disabled.'
  );
}

export const ai = genkit({
  plugins,
  // A default model cannot be set if the plugin is not guaranteed to be available.
  // The model must be specified in each prompt or generate call.
});

import { validateStructuredOutput } from './json-validation.mjs';

self.onmessage = ({ data }) => {
  const { schemaText, outputText } = data;
  self.postMessage(validateStructuredOutput(schemaText, outputText));
};

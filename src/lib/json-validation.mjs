import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { JSON_INPUT_LIMIT } from './json-validation-limits.mjs';

const DRAFT_7 = 'http://json-schema.org/draft-07/schema#';
const DRAFT_2020 = 'https://json-schema.org/draft/2020-12/schema';
const options = { allErrors: true, strict: true, strictTypes: false, strictTuples: false, strictRequired: false, allowUnionTypes: true, ownProperties: true };
const pointer = value => String(value).replaceAll('~', '~0').replaceAll('/', '~1');

export function validateStructuredOutput(schemaText, outputText) {
  if (outputText.length > JSON_INPUT_LIMIT || schemaText.length > JSON_INPUT_LIMIT) {
    return { status: 'limit', message: 'Keep each editor below 1,000,000 characters. Split a larger document into smaller examples.', errors: [] };
  }
  let data;
  try { data = JSON.parse(outputText); }
  catch (error) { return { status: 'json-error', message: `The output is not valid JSON. ${error.message}`, errors: [] }; }
  if (!schemaText.trim()) return { status: 'syntax-pass', message: 'Valid JSON syntax. No schema was supplied, so the content has not been checked against a contract.', errors: [] };

  let schema;
  try { schema = JSON.parse(schemaText); }
  catch (error) { return { status: 'schema-error', message: `The schema is not valid JSON. ${error.message}`, errors: [] }; }
  if (typeof schema !== 'boolean' && (schema === null || typeof schema !== 'object' || Array.isArray(schema))) {
    return { status: 'schema-error', message: 'A JSON Schema must be an object or a boolean. An array, null or a string is not a schema.', errors: [] };
  }
  const declaredDraft = schema?.$schema;
  const isDraft7 = declaredDraft === DRAFT_7 || declaredDraft === DRAFT_7.slice(0, -1);
  if (declaredDraft !== undefined && !isDraft7 && declaredDraft !== DRAFT_2020 && declaredDraft !== DRAFT_2020 + '#') {
    return { status: 'schema-error', message: 'This tool supports JSON Schema draft-07 and 2020-12. Use one of those $schema declarations, or omit it for 2020-12.', errors: [] };
  }
  const draft = isDraft7 ? 'draft-07' : '2020-12';
  try {
    // No remote loader, custom keywords or mutation options. All references must
    // resolve within the pasted schema. A worker bounds compilation and regexes.
    const ajv = addFormats(isDraft7 ? new Ajv(options) : new Ajv2020(options));
    const validate = ajv.compile(schema);
    if (validate.$async) throw new Error('Asynchronous schemas are not supported.');
    const valid = validate(data);
    const allErrors = validate.errors ?? [];
    const errors = allErrors.slice(0, 100).map(error => ({
      path: error.instancePath + (error.keyword === 'required' ? '/' + pointer(error.params.missingProperty)
        : error.keyword === 'additionalProperties' ? '/' + pointer(error.params.additionalProperty) : ''),
      rule: error.keyword, message: error.message ?? 'Constraint failed', schemaPath: error.schemaPath,
    }));
    return { status: valid ? 'pass' : 'fail', draft,
      message: valid ? `The output matches the ${draft} schema.` : `The output does not match the ${draft} schema.`,
      errors, totalErrors: allErrors.length, truncated: allErrors.length > errors.length };
  } catch (error) {
    return { status: 'schema-error', message: `The schema could not be checked. ${error.message}`, draft, errors: [] };
  }
}

const extractionFields = ['invoice_id', 'supplier', 'amount', 'currency', 'due_date'];
const nullableString = { type: ['string', 'null'] };

export const jsonValidationPresets = [
  {
    id: 'classification',
    name: 'Classification',
    description: 'A known label, a confidence from zero to one, and no extra fields.',
    schema: { type: 'object', required: ['label', 'confidence'], additionalProperties: false, properties: { label: { enum: ['positive', 'neutral', 'negative'] }, confidence: { type: 'number', minimum: 0, maximum: 1 }, reasoning: { type: 'string', maxLength: 240 } } },
    valid: { label: 'positive', confidence: 0.86, reasoning: 'The review recommends the product.' },
    invalid: { label: 'mixed', confidence: 1.4, unexpected: true },
  },
  {
    id: 'tool-call',
    name: 'Tool call',
    description: 'Only the named search tool, with a bounded query and result count.',
    schema: { type: 'object', required: ['name', 'arguments'], additionalProperties: false, properties: { name: { const: 'search_notes' }, arguments: { type: 'object', required: ['query', 'limit'], additionalProperties: false, properties: { query: { type: 'string', minLength: 1, maxLength: 200 }, limit: { type: 'integer', minimum: 1, maximum: 20 } } } } },
    valid: { name: 'search_notes', arguments: { query: 'context window', limit: 5 } },
    invalid: { name: 'delete_notes', arguments: { query: '', limit: 100, force: true } },
  },
  {
    id: 'invoice-lines',
    name: 'Invoice extraction',
    description: 'A date, currency and line items. A shared definition checks every line.',
    schema: { type: 'object', required: ['date', 'currency', 'items'], additionalProperties: false, properties: { date: { type: 'string', format: 'date' }, currency: { enum: ['GBP', 'EUR', 'USD'] }, items: { type: 'array', minItems: 1, items: { $ref: '#/$defs/line' } } }, $defs: { line: { type: 'object', required: ['description', 'quantity', 'unitPrice'], additionalProperties: false, properties: { description: { type: 'string', minLength: 1 }, quantity: { type: 'integer', minimum: 1 }, unitPrice: { type: 'number', minimum: 0 } } } } },
    valid: { date: '2026-09-12', currency: 'GBP', items: [{ description: 'Notebook', quantity: 2, unitPrice: 4.5 }] },
    invalid: { date: '2026-02-30', currency: 'GBP', items: [{ description: 'Notebook', quantity: 0, unitPrice: -4.5 }] },
  },
  {
    id: 'answer-or-abstain',
    name: 'Answer or abstain',
    description: 'Exactly one shape: an answer with a source, or a reason to abstain.',
    schema: { oneOf: [
      { type: 'object', required: ['answer', 'source'], additionalProperties: false, properties: { answer: { type: 'string', minLength: 1 }, source: { type: 'string', format: 'uri' } } },
      { type: 'object', required: ['abstain'], additionalProperties: false, properties: { abstain: { type: 'string', minLength: 1 } } },
    ] },
    valid: { abstain: 'The supplied notes do not contain this information.' },
    invalid: { answer: 'The answer is 42.', source: 'trust me', abstain: 'Not sure.' },
  },
  {
    id: 'recipe-invoice',
    recipeId: 'data-extraction',
    name: 'Recipe: invoice with evidence',
    description: 'The extraction recipe’s five values and source quotes. Missing values and their evidence must both be null. Check every quote against the source yourself.',
    source: 'Invoice INV-104 from Juniper Studio. Amount due: GBP 129.50. Please contact us if anything is unclear.',
    schema: {
      type: 'object', required: ['values', 'evidence'], additionalProperties: false,
      properties: {
        values: {
          type: 'object', required: extractionFields, additionalProperties: false,
          properties: { invoice_id: nullableString, supplier: nullableString, amount: { type: ['number', 'null'] }, currency: nullableString, due_date: { type: ['string', 'null'], format: 'date' } },
        },
        evidence: {
          type: 'object', required: extractionFields, additionalProperties: false,
          properties: Object.fromEntries(extractionFields.map(field => [field, nullableString])),
        },
      },
      allOf: extractionFields.map(field => ({
        if: { properties: { values: { type: 'object', properties: { [field]: { type: 'null' } } } } },
        then: { properties: { evidence: { type: 'object', properties: { [field]: { type: 'null' } } } } },
        else: { properties: { evidence: { type: 'object', properties: { [field]: { type: 'string', minLength: 1 } } } } },
      })),
    },
    valid: {
      values: { invoice_id: 'INV-104', supplier: 'Juniper Studio', amount: 129.5, currency: 'GBP', due_date: null },
      evidence: { invoice_id: 'INV-104', supplier: 'Juniper Studio', amount: 'GBP 129.50', currency: 'GBP 129.50', due_date: null },
    },
    invalid: {
      values: { invoice_id: 'INV-104', supplier: 'Juniper Studio', amount: '129.50', currency: 'GBP', due_date: '2026-02-30' },
      evidence: { invoice_id: 'INV-104', supplier: 'Juniper Studio', amount: 'GBP 129.50', currency: 'GBP 129.50', due_date: null },
    },
  },
];

export function jsonValidationPresetIndex(id) {
  return typeof id === 'string' ? jsonValidationPresets.findIndex(preset => preset.id === id) : -1;
}

export function jsonValidationRecipeHref(recipeId) {
  const preset = jsonValidationPresets.find(item => item.recipeId === recipeId);
  return preset ? `/lab/json-validator?preset=${encodeURIComponent(preset.id)}` : null;
}

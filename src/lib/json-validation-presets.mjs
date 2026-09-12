export const jsonValidationPresets = [
  {
    name: 'Classification',
    description: 'A known label, a confidence from zero to one, and no extra fields.',
    schema: { type: 'object', required: ['label', 'confidence'], additionalProperties: false, properties: { label: { enum: ['positive', 'neutral', 'negative'] }, confidence: { type: 'number', minimum: 0, maximum: 1 }, reasoning: { type: 'string', maxLength: 240 } } },
    valid: { label: 'positive', confidence: 0.86, reasoning: 'The review recommends the product.' },
    invalid: { label: 'mixed', confidence: 1.4, unexpected: true },
  },
  {
    name: 'Tool call',
    description: 'Only the named search tool, with a bounded query and result count.',
    schema: { type: 'object', required: ['name', 'arguments'], additionalProperties: false, properties: { name: { const: 'search_notes' }, arguments: { type: 'object', required: ['query', 'limit'], additionalProperties: false, properties: { query: { type: 'string', minLength: 1, maxLength: 200 }, limit: { type: 'integer', minimum: 1, maximum: 20 } } } } },
    valid: { name: 'search_notes', arguments: { query: 'context window', limit: 5 } },
    invalid: { name: 'delete_notes', arguments: { query: '', limit: 100, force: true } },
  },
  {
    name: 'Invoice extraction',
    description: 'A date, currency and line items. A shared definition checks every line.',
    schema: { type: 'object', required: ['date', 'currency', 'items'], additionalProperties: false, properties: { date: { type: 'string', format: 'date' }, currency: { enum: ['GBP', 'EUR', 'USD'] }, items: { type: 'array', minItems: 1, items: { $ref: '#/$defs/line' } } }, $defs: { line: { type: 'object', required: ['description', 'quantity', 'unitPrice'], additionalProperties: false, properties: { description: { type: 'string', minLength: 1 }, quantity: { type: 'integer', minimum: 1 }, unitPrice: { type: 'number', minimum: 0 } } } } },
    valid: { date: '2026-09-12', currency: 'GBP', items: [{ description: 'Notebook', quantity: 2, unitPrice: 4.5 }] },
    invalid: { date: '2026-02-30', currency: 'GBP', items: [{ description: 'Notebook', quantity: 0, unitPrice: -4.5 }] },
  },
  {
    name: 'Answer or abstain',
    description: 'Exactly one shape: an answer with a source, or a reason to abstain.',
    schema: { oneOf: [
      { type: 'object', required: ['answer', 'source'], additionalProperties: false, properties: { answer: { type: 'string', minLength: 1 }, source: { type: 'string', format: 'uri' } } },
      { type: 'object', required: ['abstain'], additionalProperties: false, properties: { abstain: { type: 'string', minLength: 1 } } },
    ] },
    valid: { abstain: 'The supplied notes do not contain this information.' },
    invalid: { answer: 'The answer is 42.', source: 'trust me', abstain: 'Not sure.' },
  },
];

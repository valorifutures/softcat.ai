import { useState } from 'preact/hooks';

interface ValidationResult {
  path: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const presetSchemas: { name: string; schema: string }[] = [
  {
    name: 'Tool Use Response',
    schema: JSON.stringify({"type":"object","required":["id","type","name","input"],"properties":{"id":{"type":"string"},"type":{"type":"string","enum":["tool_use"]},"name":{"type":"string"},"input":{"type":"object"}}}, null, 2),
  },
  {
    name: 'Function Call',
    schema: JSON.stringify({"type":"object","required":["name","arguments"],"properties":{"name":{"type":"string"},"arguments":{"type":"object"}}}, null, 2),
  },
  {
    name: 'Classification',
    schema: JSON.stringify({"type":"object","required":["label","confidence"],"properties":{"label":{"type":"string"},"confidence":{"type":"number"},"reasoning":{"type":"string"}}}, null, 2),
  },
  {
    name: 'Extraction',
    schema: JSON.stringify({"type":"object","required":["entities"],"properties":{"entities":{"type":"array","items":{"type":"object","required":["name","type","value"],"properties":{"name":{"type":"string"},"type":{"type":"string"},"value":{"type":"string"}}}}}}, null, 2),
  },
];

function validateJsonAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
  path = ''
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const currentPath = path || 'root';

  // Type check
  if (schema.type) {
    const expectedType = schema.type as string;
    const actualType = Array.isArray(data) ? 'array' : typeof data === 'object' && data !== null ? 'object' : typeof data;

    if (expectedType === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        results.push({ path: currentPath, status: 'fail', message: `Expected integer, got ${actualType}` });
      } else {
        results.push({ path: currentPath, status: 'pass', message: 'Type: integer' });
      }
    } else if (actualType !== expectedType) {
      results.push({ path: currentPath, status: 'fail', message: `Expected ${expectedType}, got ${actualType}` });
      return results;
    } else {
      results.push({ path: currentPath, status: 'pass', message: `Type: ${expectedType}` });
    }
  }

  // Enum validation
  if (schema.enum && Array.isArray(schema.enum)) {
    const allowed = schema.enum as unknown[];
    if (!allowed.some((v) => v === data)) {
      results.push({ path: currentPath, status: 'fail', message: `Value "${String(data)}" not in enum [${allowed.map((v) => JSON.stringify(v)).join(', ')}]` });
    } else {
      results.push({ path: currentPath, status: 'pass', message: `Enum: valid` });
    }
  }

  // Pattern validation
  if (schema.pattern && typeof schema.pattern === 'string' && typeof data === 'string') {
    try {
      const regex = new RegExp(schema.pattern as string);
      if (!regex.test(data)) {
        results.push({ path: currentPath, status: 'fail', message: `Value "${data}" does not match pattern /${schema.pattern}/` });
      } else {
        results.push({ path: currentPath, status: 'pass', message: `Pattern: matches /${schema.pattern}/` });
      }
    } catch {
      results.push({ path: currentPath, status: 'warn', message: `Invalid regex pattern: ${schema.pattern}` });
    }
  }

  // Required fields
  if (schema.required && Array.isArray(schema.required) && typeof data === 'object' && data !== null) {
    for (const field of schema.required as string[]) {
      if (!(field in (data as Record<string, unknown>))) {
        results.push({ path: `${currentPath}.${field}`, status: 'fail', message: 'Required field missing' });
      }
    }
  }

  // Properties (recurse)
  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const obj = data as Record<string, unknown>;

    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) {
        results.push(...validateJsonAgainstSchema(obj[key], propSchema, `${currentPath}.${key}`));
      }
    }

    // Extra fields not in schema
    const schemaKeys = new Set(Object.keys(props));
    for (const key of Object.keys(obj)) {
      if (!schemaKeys.has(key)) {
        results.push({ path: `${currentPath}.${key}`, status: 'warn', message: 'Field not defined in schema' });
      }
    }
  }

  // Array items
  if (schema.items && Array.isArray(data)) {
    const itemSchema = schema.items as Record<string, unknown>;
    for (let i = 0; i < data.length; i++) {
      results.push(...validateJsonAgainstSchema(data[i], itemSchema, `${currentPath}[${i}]`));
    }
  }

  return results;
}

export default function JsonValidator() {
  const [schemaText, setSchemaText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [results, setResults] = useState<ValidationResult[] | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  function validate() {
    setResults(null);
    setJsonError(null);
    setSchemaError(null);

    // Parse output JSON
    let data: unknown;
    try {
      data = JSON.parse(outputText);
    } catch (e) {
      setJsonError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }

    // If no schema, just confirm valid JSON
    if (!schemaText.trim()) {
      setResults([{ path: 'root', status: 'pass', message: 'Valid JSON (no schema to check against)' }]);
      return;
    }

    // Parse schema
    let schema: Record<string, unknown>;
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      setSchemaError(`Invalid schema JSON: ${(e as Error).message}`);
      return;
    }

    const validationResults = validateJsonAgainstSchema(data, schema);
    if (validationResults.length === 0) {
      validationResults.push({ path: 'root', status: 'pass', message: 'Valid JSON, no schema rules matched' });
    }
    setResults(validationResults);
  }

  function clear() {
    setSchemaText('');
    setOutputText('');
    setResults(null);
    setJsonError(null);
    setSchemaError(null);
  }

  const passes = results?.filter((r) => r.status === 'pass').length ?? 0;
  const fails = results?.filter((r) => r.status === 'fail').length ?? 0;
  const warns = results?.filter((r) => r.status === 'warn').length ?? 0;

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            JSON Schema <span class="normal-case font-sans">(optional)</span>
          </label>
          <div class="flex flex-wrap gap-2 mb-2">
            {presetSchemas.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setSchemaText(preset.schema)}
                class="px-2 py-1 bg-surface border border-surface-light rounded font-mono text-xs text-text-muted hover:text-neon-purple hover:border-neon-purple/40 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <textarea
            value={schemaText}
            onInput={(e) => setSchemaText((e.target as HTMLTextAreaElement).value)}
            placeholder='{"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}'
            class="w-full h-52 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
          {schemaError && (
            <p class="font-mono text-xs text-neon-red">{schemaError}</p>
          )}
        </div>
        <div class="space-y-2">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            AI output
          </label>
          <textarea
            value={outputText}
            onInput={(e) => setOutputText((e.target as HTMLTextAreaElement).value)}
            placeholder='{"name":"Claude","version":3.5}'
            class="w-full h-52 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
          {jsonError && (
            <p class="font-mono text-xs text-neon-red">{jsonError}</p>
          )}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          onClick={validate}
          disabled={!outputText.trim()}
          class="px-5 py-2 bg-neon-green/10 border border-neon-green/40 rounded-lg font-mono text-sm text-neon-green hover:bg-neon-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Validate
        </button>
        <button
          onClick={clear}
          class="px-4 py-2 bg-surface border border-surface-light rounded-lg font-mono text-xs text-text-muted hover:text-text-bright transition-colors"
        >
          Clear
        </button>
      </div>

      {results && (
        <div class="space-y-4">
          {/* Summary */}
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-neon-green">{passes}</div>
              <div class="font-mono text-xs text-text-muted mt-1">passed</div>
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-neon-amber">{warns}</div>
              <div class="font-mono text-xs text-text-muted mt-1">warnings</div>
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class={`font-mono text-2xl font-bold ${fails > 0 ? 'text-neon-red' : 'text-neon-green'}`}>{fails}</div>
              <div class="font-mono text-xs text-text-muted mt-1">failed</div>
            </div>
          </div>

          {/* Detail */}
          <div class="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                class={`bg-surface border rounded-lg px-4 py-3 flex items-start gap-3 ${
                  r.status === 'pass' ? 'border-neon-green/20' :
                  r.status === 'warn' ? 'border-neon-amber/20' :
                  'border-neon-red/20'
                }`}
              >
                <span class={`font-mono text-xs font-bold shrink-0 mt-0.5 ${
                  r.status === 'pass' ? 'text-neon-green' :
                  r.status === 'warn' ? 'text-neon-amber' :
                  'text-neon-red'
                }`}>
                  {r.status === 'pass' ? 'PASS' : r.status === 'warn' ? 'WARN' : 'FAIL'}
                </span>
                <span class="font-mono text-xs text-neon-cyan shrink-0">{r.path}</span>
                <span class="font-mono text-xs text-text-muted">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p class="font-mono text-xs text-text-muted">
        Validates JSON syntax and checks against a JSON Schema (type, required, properties, items, enum, pattern). Everything runs in your browser.
      </p>
    </div>
  );
}

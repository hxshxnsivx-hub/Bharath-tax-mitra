/**
 * ITR JSON validator (task 3.2.2 / OPT-P3.1) — offline, client-side.
 *
 * Validates generated ITR JSON against the canonical schema
 * (shared/schemas/itr1-fy2025-26.schema.json) and returns field-level errors
 * keyed by JSON pointer (Req 17), so the UI can point the user at the exact
 * field to fix. The SAME schema file drives the backend export Lambda's Python
 * `jsonschema`, so an export that passes here cannot be rejected server-side
 * for a shape mismatch.
 *
 * Implementation note: this is a small, dependency-free walker covering exactly
 * the draft-07 keywords the ITR schema uses (type, required, properties,
 * additionalProperties, enum, pattern, minLength, minItems, minimum, integer,
 * items). Ajv was intentionally NOT used — Vite's dependency pre-bundler
 * mangles Ajv 8's internals (empty `instancePath`, broken `opts`), which would
 * silently return wrong error paths. A focused validator is both correct across
 * vitest/dev/build and lighter in the bundle.
 */

import itr1Schema from '../../../shared/schemas/itr1-fy2025-26.schema.json';

export interface ValidationIssue {
  /** JSON pointer, e.g. "/ITR/ITR1/Form_ITR1/PersonalInfo/PAN". */
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

type Schema = Record<string, unknown>;

function typeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}

function walk(value: unknown, schema: Schema, path: string, errors: ValidationIssue[]): void {
  const type = schema.type as string | undefined;

  if (type && !typeMatches(value, type)) {
    errors.push({ path: path || '/', message: `must be ${type}` });
    return; // further keyword checks assume the type held
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value as never)) {
    errors.push({ path: path || '/', message: `must be one of ${JSON.stringify(schema.enum)}` });
  }

  if (typeof value === 'string') {
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path: path || '/', message: 'has an invalid format' });
    }
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      errors.push({ path: path || '/', message: `must be at least ${schema.minLength} character(s)` });
    }
  }

  if (typeof value === 'number' && typeof schema.minimum === 'number' && value < schema.minimum) {
    errors.push({ path: path || '/', message: `must be ≥ ${schema.minimum}` });
  }

  if (type === 'object' && typeMatches(value, 'object')) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties as Record<string, Schema>) ?? {};
    // `undefined` values are dropped by JSON.stringify, so a key present with
    // an undefined value is treated as absent — validating the object matches
    // validating the serialized JSON.
    const has = (key: string) => key in obj && obj[key] !== undefined;

    for (const key of (schema.required as string[]) ?? []) {
      if (!has(key)) {
        errors.push({ path: path || '/', message: `missing required field "${key}"` });
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (has(key) && !(key in props)) {
          errors.push({ path: `${path}/${key}`, message: `unexpected field "${key}"` });
        }
      }
    }

    for (const [key, sub] of Object.entries(props)) {
      if (has(key)) walk(obj[key], sub, `${path}/${key}`, errors);
    }
  }

  if (type === 'array' && Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push({ path: path || '/', message: `must have at least ${schema.minItems} item(s)` });
    }
    const itemSchema = schema.items as Schema | undefined;
    if (itemSchema) {
      value.forEach((item, i) => walk(item, itemSchema, `${path}/${i}`, errors));
    }
  }
}

/** Validate an ITR-1 payload against the schema of record. Never throws. */
export function validateITR1(payload: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  walk(payload, itr1Schema as Schema, '', errors);
  return { valid: errors.length === 0, errors };
}

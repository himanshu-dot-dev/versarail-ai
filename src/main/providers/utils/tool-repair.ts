/**
 * Tool Call Argument Repair & Sanitizer
 *
 * Models occasionally wrap tool arguments in markdown fences (e.g. ```json { ... } ```)
 * or output minor syntax anomalies. This cleans them so JSON parsing never fails unnecessarily.
 */

export function repairToolArguments(rawArgs: string): string {
  if (!rawArgs || typeof rawArgs !== 'string') return '{}'

  let cleaned = rawArgs.trim()

  // 1. Strip markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  // 2. If valid JSON directly, return as is
  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {
    // 3. Fallback: try stripping trailing commas before closing braces/brackets
    const sanitized = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .trim()

    try {
      JSON.parse(sanitized)
      return sanitized
    } catch {
      return cleaned
    }
  }
}


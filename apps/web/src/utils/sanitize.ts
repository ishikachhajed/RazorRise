/**
 * Frontend Sanitization Utility
 * Guarantees that internal model reasoning tags (<think>...</think>), prompt leakages,
 * or raw chain-of-thought blocks are never rendered anywhere in the user interface.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  let cleaned = String(text);

  // Strip <think>...</think> blocks (including multiline)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Strip unclosed <think> or stray tags
  cleaned = cleaned.replace(/<think>/gi, '');
  cleaned = cleaned.replace(/<\/think>/gi, '');

  // Trim leading/trailing whitespace
  return cleaned.trim();
}

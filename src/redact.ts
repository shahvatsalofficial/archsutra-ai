const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { name: 'github-pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: 'openai-style-key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'private-key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  {
    name: 'credential-assignment',
    re: /\b(password|passwd|secret|api[_-]?key|token|access[_-]?key)\b(\s*[:=]\s*)(["'])[^"'\s]{8,}\3/gi,
  },
];

export interface SecretHit {
  kind: string;
}

/** Return the kinds of secret found in a line (never the value). */
export function detectSecrets(line: string): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (p.re.test(line)) hits.push({ kind: p.name });
  }
  return hits;
}

/** Mask anything that looks like a secret. Used on every excerpt before it reaches a report. */
export function redact(text: string): string {
  let out = text;
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (p.name === 'credential-assignment') {
      out = out.replace(p.re, (_m, k: string, sep: string, q: string) => `${k}${sep}${q}[REDACTED]${q}`);
    } else {
      out = out.replace(p.re, `[REDACTED:${p.name}]`);
    }
  }
  return out;
}

export function excerpt(line: string, max = 160): string {
  const r = redact(line.trim());
  return r.length > max ? `${r.slice(0, max)}...` : r;
}

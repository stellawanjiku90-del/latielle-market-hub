const ITERATIONS = 210_000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin: string, salt: string) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial, 256
  );
  return `pbkdf2$${ITERATIONS}$${toHex(new Uint8Array(bits))}`;
}

export async function verifyPin(pin: string, salt: string, stored: string) {
  const candidate = await hashPin(pin, salt);
  const a = new TextEncoder().encode(candidate);
  const b = new TextEncoder().encode(stored);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

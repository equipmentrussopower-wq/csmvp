
/**
 * Hashes a PIN string for secure storage/verification.
 * Uses Web Crypto API (SHA-256) if available, otherwise falls back to a 
 * simpler string hashing algorithm for non-secure contexts (e.g. HTTP development).
 */
export async function hashPin(pin: string): Promise<string> {
    const saltedPin = pin + "chase_salt_2026";

    // Check if we are in a secure context (HTTPS/localhost) where crypto.subtle is available
    if (window.crypto && window.crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(saltedPin);
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        } catch (e) {
            console.warn("Web Crypto failed, falling back to simple hash", e);
        }
    }

    // Fallback: Simple but deterministic hashing for non-secure environments
    // This is NOT cryptographically secure but ensures the app works in all environments.
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < saltedPin.length; i++) {
        ch = saltedPin.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

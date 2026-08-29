import { scrypt, randomBytes, createHash } from "node:crypto"

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_KEYLEN = 64

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err)
      else resolve(derived)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt}$${hash.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  try {
    const parts = encoded.split("$")
    if (parts.length !== 4 || parts[0] !== "scrypt") return false
    const params: Record<string, number> = {}
    for (const kv of parts[1].split(",")) {
      const [k, v] = kv.split("=")
      params[k] = parseInt(v, 10)
    }
    const salt = parts[2]
    const expected = parts[3]
    const klen = Buffer.from(expected, "hex").length
    const derived = await scryptAsync(password, salt, klen, {
      N: params.N,
      r: params.r,
      p: params.p,
    })
    return derived.toString("hex") === expected
  } catch {
    return false
  }
}

export function generateToken(): Buffer {
  return randomBytes(32)
}

export function hashToken(token: Buffer): Buffer {
  return createHash("sha256").update(token).digest()
}

export function tokenToHex(token: Buffer): string {
  return token.toString("hex")
}

export function hexToToken(hex: string): Buffer {
  return Buffer.from(hex, "hex")
}

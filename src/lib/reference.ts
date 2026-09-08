import { randomBytes } from "node:crypto";

export function reference(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
}

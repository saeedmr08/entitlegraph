import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { loadJsonFile, saveJsonFile } from "../persistence/json-file.js";
import { ForbiddenError, ValidationError } from "./errors.js";

export type ActorRole = "member" | "approver" | "admin";

export interface Identity {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: ActorRole;
  passwordSalt: string;
  passwordHash: string;
}

export interface Session {
  token: string;
  actorId: string;
  organizationId: string;
  expiresAt: string;
}

interface IdentityFile {
  identities: Identity[];
  sessions: Session[];
}

const DEMO_PASSWORD_NOTE =
  "Demo passwords are local-only and printed in the README, never in API responses.";

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

function passwordsMatch(password: string, identity: Identity): boolean {
  const actual = Buffer.from(hashPassword(password, identity.passwordSalt), "hex");
  const expected = Buffer.from(identity.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function seedIdentity(
  id: string,
  email: string,
  name: string,
  role: ActorRole,
  password: string,
): Identity {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    id,
    organizationId: "org-northwind",
    email,
    name,
    role,
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
  };
}

export class IdentityDirectory {
  constructor(private readonly filePath: string) {}

  private read(): IdentityFile {
    const stored = loadJsonFile<IdentityFile>(this.filePath, {
      identities: [],
      sessions: [],
    });
    if (stored.identities.length === 0) {
      const seeded: IdentityFile = {
        identities: [
          seedIdentity(
            "maya",
            "maya@northwind.example",
            "Maya Chen",
            "member",
            "northwind-maya",
          ),
          seedIdentity(
            "leah",
            "leah@northwind.example",
            "Leah Young",
            "approver",
            "northwind-leah",
          ),
        ],
        sessions: [],
      };
      saveJsonFile(this.filePath, seeded);
      return seeded;
    }
    return stored;
  }

  private write(file: IdentityFile): void {
    saveJsonFile(this.filePath, file);
  }

  listPublicIdentities(organizationId: string) {
    return this.read()
      .identities.filter((identity) => identity.organizationId === organizationId)
      .map(({ passwordHash, passwordSalt, ...publicIdentity }) => publicIdentity);
  }

  authenticate(email: string, password: string): Session {
    const file = this.read();
    const identity = file.identities.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (identity === undefined || !passwordsMatch(password, identity)) {
      throw new ForbiddenError("INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const session: Session = {
      token: randomBytes(24).toString("hex"),
      actorId: identity.id,
      organizationId: identity.organizationId,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };
    file.sessions = file.sessions.filter(
      (item) => Date.parse(item.expiresAt) > Date.now(),
    );
    file.sessions.push(session);
    this.write(file);
    return session;
  }

  resolve(token: string | undefined): Identity {
    if (token === undefined || token.length === 0) {
      throw new ValidationError("Authentication is required");
    }
    const file = this.read();
    const session = file.sessions.find((item) => item.token === token);
    if (session === undefined || Date.parse(session.expiresAt) <= Date.now()) {
      throw new ForbiddenError("SESSION_EXPIRED", "Sign in again");
    }
    const identity = file.identities.find((item) => item.id === session.actorId);
    if (identity === undefined) {
      throw new ForbiddenError("SESSION_EXPIRED", "Sign in again");
    }
    return identity;
  }

  revoke(token: string | undefined): void {
    if (token === undefined) {
      return;
    }
    const file = this.read();
    file.sessions = file.sessions.filter((item) => item.token !== token);
    this.write(file);
  }

  demoNote(): string {
    return DEMO_PASSWORD_NOTE;
  }
}

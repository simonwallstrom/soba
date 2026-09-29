import { parseHouseholdStoreId } from "@shared/household";

import { isMember } from "../household/household";
import { getSession } from "./auth";

export async function assertStoreAccess(storeId: string, cookie: string | undefined) {
  const householdId = parseHouseholdStoreId(storeId);
  if (!householdId || !cookie) throw new Error("Unauthorized");

  // Sync can outlive the session cookie cache, so always check D1.
  const session = await getSession(new Headers({ cookie }), { fresh: true });
  if (!session) throw new Error("Unauthorized");
  if (!(await isMember(session.user.id, householdId))) throw new Error("Forbidden");
}

"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncState } from "@/lib/sync/SyncEngine";

/** Live sync status for status chips / gating. `status: null` = cloud inactive. */
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(() => syncEngine.getState());
  useEffect(() => syncEngine.subscribe(setState), []);
  return state;
}

"use client";

import { useState } from "react";

export interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor: { id: string; full_name: string | null; email: string | null } | null;
}

export function AuditClient({ logs }: { logs: AuditLogRow[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-800 bg-stone-950/60 text-[11px] uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Action</th>
                <th className="py-3.5 px-4 font-semibold">Entity</th>
                <th className="py-3.5 px-4 font-semibold">Actor / Admin</th>
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-stone-500">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-300">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="ml-1.5 font-mono text-[11px] text-stone-500">
                          {log.entity_id.slice(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">
                        {log.actor?.full_name || log.actor?.email || "System / Trigger"}
                      </div>
                      {log.actor?.email && log.actor.full_name && (
                        <div className="text-[11px] text-stone-500 font-mono">{log.actor.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-200 hover:text-white transition-colors"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {selectedLog.action}
                </span>
                <span className="ml-2 text-xs text-stone-400">
                  on {selectedLog.entity_type} ({selectedLog.entity_id || "global"})
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded p-1 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-stone-500">Performed by:</span>
                  <p className="mt-0.5 font-medium text-white">
                    {selectedLog.actor?.email || "System / Database Function"}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Timestamp:</span>
                  <p className="mt-0.5 font-mono text-stone-300">
                    {new Date(selectedLog.created_at).toISOString()}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-stone-500">Audit Metadata & Diff:</span>
                <pre className="mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950 p-4 font-mono text-[11px] leading-relaxed text-amber-300/90">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>

              {(selectedLog.ip_address || selectedLog.user_agent) && (
                <div className="border-t border-stone-800 pt-3 text-[11px] text-stone-500 font-mono">
                  <div>IP: {selectedLog.ip_address || "Unknown"}</div>
                  <div className="truncate">UA: {selectedLog.user_agent || "Unknown"}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-stone-800 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-stone-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


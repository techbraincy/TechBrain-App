import { headers } from "next/headers";
import Link from "next/link";
import { getSheetsByUserId, getAllSheets } from "@/lib/db/queries/sheets";
import { Sheet, ArrowRight, Plus, Database } from "lucide-react";
import type { Sheet as SheetType } from "@/types/db";

export default async function SheetsPage() {
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role = h.get("x-user-role");

  const sheets: SheetType[] =
    role === "superadmin" ? await getAllSheets() : await getSheetsByUserId(userId);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Sheet className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              {role === "superadmin" ? "All Sheets" : "My Sheets"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{sheets.length} connected</p>
          </div>
        </div>
        {role === "superadmin" && (
          <Link
            href="/admin/sheets"
            className="flex items-center gap-2 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 px-3 py-2 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Sheet
          </Link>
        )}
      </div>

      {sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center">
          <Database className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No sheets connected</p>
          <p className="text-sm text-slate-600 mt-1">
            {role === "superadmin"
              ? "Register a Google Sheet to get started."
              : "Contact your administrator to get sheets assigned."}
          </p>
          {role === "superadmin" && (
            <Link
              href="/admin/sheets"
              className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-lg transition-all"
            >
              Register a sheet →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/dashboard/sheets/${sheet.id}`}
              className="group flex items-start gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/30 hover:bg-slate-800/60 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-indigo-500/30 transition-colors">
                <Sheet className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-slate-200 truncate">{sheet.display_name}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{sheet.spreadsheet_id}</p>
                <span className="inline-block mt-2 text-[10px] text-slate-600 bg-slate-800 border border-slate-700 rounded px-2 py-0.5">
                  {sheet.range_notation}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

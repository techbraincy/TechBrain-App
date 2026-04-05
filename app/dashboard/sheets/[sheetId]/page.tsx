import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAssignedSheetByIdForUser, getSheetById } from "@/lib/db/queries/sheets";
import SheetDataTable from "@/components/dashboard/sheet-data-table";
import Link from "next/link";
import { Sheet, ChevronRight } from "lucide-react";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  const h = await headers();
  const userId = h.get("x-user-id")!;
  const role = h.get("x-user-role");

  const sheet =
    role === "superadmin"
      ? await getSheetById(sheetId)
      : await getAssignedSheetByIdForUser(sheetId, userId);

  if (!sheet) notFound();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/sheets" className="hover:text-slate-300 transition-colors">
          Sheets
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-300">{sheet.display_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Sheet className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{sheet.display_name}</h1>
          <p className="text-xs text-slate-500 font-mono mt-1">{sheet.spreadsheet_id} · {sheet.range_notation}</p>
        </div>
      </div>

      {/* Data table */}
      <SheetDataTable sheetId={sheetId} displayName={sheet.display_name} />
    </div>
  );
}

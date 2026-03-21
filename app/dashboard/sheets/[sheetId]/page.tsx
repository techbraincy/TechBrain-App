import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAssignedSheetByIdForUser, getSheetById } from "@/lib/db/queries/sheets";
import SheetDataTable from "@/components/dashboard/sheet-data-table";
import Link from "next/link";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  const headersList = await headers();
  const userId = headersList.get("x-user-id")!;
  const role = headersList.get("x-user-role");

  // Verify access
  const sheet =
    role === "superadmin"
      ? await getSheetById(sheetId)
      : await getAssignedSheetByIdForUser(sheetId, userId);

  if (!sheet) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{sheet.display_name}</h1>
        <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
          {sheet.range_notation}
        </span>
      </div>

      {/* Client Component — fetches data and handles refresh */}
      <SheetDataTable sheetId={sheetId} displayName={sheet.display_name} />
    </div>
  );
}

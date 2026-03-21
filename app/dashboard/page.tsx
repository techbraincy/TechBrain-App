import { headers } from "next/headers";
import Link from "next/link";
import { getSheetsByUserId, getAllSheets } from "@/lib/db/queries/sheets";
import type { Sheet } from "@/types/db";

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id")!;
  const role = headersList.get("x-user-role");

  // Superadmin sees all sheets; regular users see only assigned ones
  const sheets: Sheet[] =
    role === "superadmin"
      ? await getAllSheets()
      : await getSheetsByUserId(userId);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {role === "superadmin" ? "All Sheets" : "My Sheets"}
      </h1>

      {sheets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 text-sm">
            No sheets assigned yet.{" "}
            {role === "superadmin" && (
              <Link href="/admin/sheets" className="text-blue-600 hover:underline">
                Register a sheet
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/dashboard/sheets/${sheet.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{sheet.display_name}</p>
                  <p className="mt-1 text-xs text-gray-500 font-mono truncate max-w-[200px]">
                    {sheet.spreadsheet_id}
                  </p>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                  {sheet.range_notation}
                </span>
              </div>
              <p className="mt-3 text-xs text-blue-600">Open →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

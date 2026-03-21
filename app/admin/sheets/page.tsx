import { getAllSheets } from "@/lib/db/queries/sheets";
import SheetRegistry from "@/components/admin/sheet-registry";

export default async function AdminSheetsPage() {
  const sheets = await getAllSheets();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Sheet Registry</h1>
      <SheetRegistry sheets={sheets} />
    </div>
  );
}

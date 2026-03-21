import { notFound } from "next/navigation";
import { getUserById } from "@/lib/db/queries/users";
import { getAllSheets, getAssignmentsByUserId } from "@/lib/db/queries/sheets";
import UserDetail from "@/components/admin/user-detail";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, allSheets, assignments] = await Promise.all([
    getUserById(userId),
    getAllSheets(),
    getAssignmentsByUserId(userId),
  ]);

  if (!user) notFound();

  const assignedSheetIds = new Set(assignments.map((a) => a.sheet_id));

  return (
    <UserDetail
      user={user}
      allSheets={allSheets}
      assignedSheetIds={Array.from(assignedSheetIds)}
    />
  );
}

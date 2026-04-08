import { notFound } from "next/navigation";
import { getUserById, getUserPermissions } from "@/lib/db/queries/users";
import { getAllSheets, getAssignmentsByUserId } from "@/lib/db/queries/sheets";
import { getAllTenants } from "@/lib/db/queries/tenants";
import UserDetail from "@/components/admin/user-detail";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, allSheets, assignments, permissions, allTenants] = await Promise.all([
    getUserById(userId),
    getAllSheets(),
    getAssignmentsByUserId(userId),
    getUserPermissions(userId),
    getAllTenants(),
  ]);

  if (!user) notFound();

  const assignedSheetIds = new Set(assignments.map((a) => a.sheet_id));

  return (
    <UserDetail
      user={user}
      allSheets={allSheets}
      assignedSheetIds={Array.from(assignedSheetIds)}
      initialPermissions={permissions}
      allTenants={allTenants}
    />
  );
}

import { getAllUsers } from "@/lib/db/queries/users";
import UserTable from "@/components/admin/user-table";

export default async function AdminPage() {
  const users = await getAllUsers();

  return <UserTable users={users} />;
}

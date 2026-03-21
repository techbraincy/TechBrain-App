import { getAllUsers } from "@/lib/db/queries/users";
import UserTable from "@/components/admin/user-table";

export default async function AdminPage() {
  const users = await getAllUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <CreateUserButton />
      </div>
      <UserTable users={users} />
    </div>
  );
}

// Inline client trigger for the create dialog
function CreateUserButton() {
  return (
    <a
      href="/admin?action=create"
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
    >
      + New User
    </a>
  );
}

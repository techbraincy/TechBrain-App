import { getAllTenants } from "@/lib/db/queries/tenants";
import TenantsTable from "@/components/admin/tenants-table";

export default async function TenantsPage() {
  const tenants = await getAllTenants();
  return <TenantsTable tenants={tenants} />;
}

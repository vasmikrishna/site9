export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import { getPlatformData } from "@/lib/superadmin-data"
import { UsersList } from "./users-list"

export default async function SuperAdminUsersPage() {
  const { users } = await getPlatformData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">{users.length} account{users.length === 1 ? "" : "s"} · sites built and total paid per account</p>
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">No users yet</p>
          </CardContent>
        </Card>
      ) : (
        <UsersList users={users} />
      )}
    </div>
  )
}

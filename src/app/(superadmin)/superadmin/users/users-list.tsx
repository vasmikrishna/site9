"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { PaginatedList } from "@/components/paginated-list"
import { formatPaise, type SAUser } from "@/lib/superadmin-data"

export function UsersList({ users }: { users: SAUser[] }) {
  return (
    <PaginatedList
      items={users}
      pageSize={12}
      searchPlaceholder="Search users by name or email..."
      testId="users"
      searchText={(u: SAUser) => `${u.name ?? ""} ${u.email} ${u.plan}`}
    >
      {(pageUsers) => (
        <div className="space-y-2">
          {pageUsers.map((u) => {
            const initial = (u.name ?? u.email)[0]?.toUpperCase() ?? "?"
            return (
              <Card key={u.id} className="hover:border-foreground/20 transition-colors">
                <CardContent className="flex items-center justify-between py-4 px-5 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-base font-bold shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{u.name ?? u.email}</span>
                        <Badge variant={u.plan === "free" ? "outline" : "success"} className="capitalize">{u.plan}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="truncate">{u.email}</span>
                        <span>·</span>
                        <span>Joined {u.created_at ? formatDate(u.created_at) : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <div className="flex items-center justify-end gap-1 text-lg font-bold tabular-nums">
                        <Globe className="h-4 w-4 text-muted-foreground" />{u.siteCount}
                      </div>
                      <p className="text-[11px] text-muted-foreground">site{u.siteCount === 1 ? "" : "s"} built</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{u.totalPaidPaise > 0 ? formatPaise(u.totalPaidPaise) : "—"}</p>
                      <p className="text-[11px] text-muted-foreground">total paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </PaginatedList>
  )
}

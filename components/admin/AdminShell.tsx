import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { BusinessWithMembership } from '@/types/db'

interface Props {
  business: BusinessWithMembership
  userEmail: string
  children: ReactNode
}

export function AdminShell({ business, userEmail, children }: Props) {
  return (
    <>
      <Sidebar business={business} />
      <div className="admin-main">
        <Topbar business={business} userEmail={userEmail} />
        <main id="admin-main" className="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  )
}

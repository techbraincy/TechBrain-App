'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/supabase-browser'
import { Button, type ButtonProps } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

interface LogoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  showIcon?: boolean
}

export function LogoutButton({ showIcon = true, children, ...props }: LogoutButtonProps) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      loading={loading}
      {...props}
    >
      {showIcon && <LogOut className="size-4" />}
      {children ?? 'Αποσύνδεση'}
    </Button>
  )
}

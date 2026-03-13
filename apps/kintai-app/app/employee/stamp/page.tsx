'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmployeeStampRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/stamp') }, [router])
  return null
}

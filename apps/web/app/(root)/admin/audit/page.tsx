'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, any>
  created_at: string
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (data) setLogs(data)
      setLoading(false)
    }
    fetch()
  }, [supabase])

  return (
    <div>
      <h1 className="text-2xl font-bold text-light-1 mb-6">Audit Logs</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-dark-3 border border-dark-4 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-4">
                <th className="text-left p-3 text-light-4 text-sm">Time</th>
                <th className="text-left p-3 text-light-4 text-sm">Action</th>
                <th className="text-left p-3 text-light-4 text-sm">Type</th>
                <th className="text-left p-3 text-light-4 text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-dark-4 hover:bg-dark-4">
                  <td className="p-3 text-sm text-light-4 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-sm text-light-2">
                    <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="p-3 text-sm text-light-4">{log.entity_type}</td>
                  <td className="p-3 text-sm text-light-5 max-w-xs truncate">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

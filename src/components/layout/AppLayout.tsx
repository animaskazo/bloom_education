import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '@/hooks/useAuth'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { perfil } = useAuth()
  
  const isApoderado = perfil?.rol === 'apoderado'

  if (isApoderado) {
    return (
      <div className="flex bg-slate-50 min-h-screen w-full">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ReminderBell from './ReminderBell'
import FloatingAddButton from './FloatingAddButton'
import QuickMemo from './QuickMemo'
import { useBackendHealth } from '../api/health'
import { QuickMemoProvider } from '../context/QuickMemoContext'

function OfflineBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: '#7f1d1d', color: '#fca5a5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
    }}>
      <span style={{ fontSize: 16 }}>⚠</span>
      バックエンドサーバーが起動していません —
      <span style={{ fontWeight: 400 }}>
        start.bat を再起動するか、ターミナルで
        <code style={{ background: 'rgba(0,0,0,.3)', padding: '1px 6px', borderRadius: 4, margin: '0 4px' }}>
          python -m uvicorn main:app --port 59080
        </code>
        を実行してください
      </span>
    </div>
  )
}

export default function Layout() {
  const { isOffline } = useBackendHealth()
  return (
    <QuickMemoProvider>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        {isOffline && <OfflineBanner />}
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={isOffline ? { paddingTop: 44 } : {}}>
          <Outlet />
        </div>
        <QuickMemo />
        <ReminderBell />
        <FloatingAddButton />
      </div>
    </QuickMemoProvider>
  )
}

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ReminderBell from './ReminderBell'
import FloatingAddButton from './FloatingAddButton'

export default function Layout() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </div>
      <ReminderBell />
      <FloatingAddButton />
    </div>
  )
}

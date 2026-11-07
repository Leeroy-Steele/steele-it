import { NavLink, Outlet } from 'react-router';

const NAV_ITEMS = [
  { to: '/topics', label: 'Topics' },
  { to: '/books', label: 'Books' },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-8 px-4 py-3">
          <span className="text-lg font-semibold">Steele-IT</span>
          <nav aria-label="Main" className="flex gap-4 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'text-indigo-700 underline' : 'text-slate-600 hover:text-slate-900'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Starlight Form Agent | Automated Form Filling',
  description: 'Browser automation agent for foster care management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-white/10 backdrop-blur-xl bg-black/20 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-display font-semibold text-xl bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    Starlight
                  </h1>
                  <p className="text-xs text-white/40">Form Automation Agent</p>
                </div>
              </div>
              <nav className="flex items-center gap-6">
                <a href="/" className="text-sm text-white/60 hover:text-white transition-colors">
                  Dashboard
                </a>
                <a href="#forms" className="text-sm text-white/60 hover:text-white transition-colors">
                  Forms
                </a>
                <a href="#history" className="text-sm text-white/60 hover:text-white transition-colors">
                  History
                </a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 py-6">
            <div className="max-w-7xl mx-auto px-6 text-center text-sm text-white/40">
              <p>Starlight Form Automation Agent © {new Date().getFullYear()}</p>
              <p className="mt-1">Automating social worker workflows with browser agents</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}


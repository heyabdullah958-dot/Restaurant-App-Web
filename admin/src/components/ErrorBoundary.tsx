import { Component, type ErrorInfo, type ReactNode } from 'react';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('foodsphere_admin_token');
      localStorage.removeItem('foodsphere_admin_refresh');
      localStorage.removeItem('foodsphere_admin_mock_user');
      localStorage.removeItem('foodsphere_admin_view');
      localStorage.removeItem('foodsphere_admin_brand_id');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Dashboard Encountered an Issue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                A browser session or cache mismatch occurred while loading the application.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
                <p className="text-[11px] font-mono text-rose-400 truncate">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-98 cursor-pointer"
              >
                Clear Session & Reload Dashboard
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                Simple Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

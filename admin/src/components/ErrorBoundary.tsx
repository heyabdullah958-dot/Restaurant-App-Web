import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  viewName?: string;
  onReset?: () => void;
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
    if (import.meta.env.DEV) {
      console.error(`[FoodSphere ErrorBoundary${this.props.viewName ? `:${this.props.viewName}` : ''}] Render crash caught:`, error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleHardReset = () => {
    try {
      localStorage.removeItem('foodsphere_admin_orders_cache');
      localStorage.removeItem('foodsphere_admin_restaurants_cache');
      localStorage.removeItem('foodsphere_admin_view');
      sessionStorage.clear();
    } catch (e) {}
    window.location.hash = '#super_dashboard';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 my-6 max-w-lg mx-auto font-sans">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold animate-pulse">
            ⚡
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-white">
              {this.props.viewName ? `${this.props.viewName.replace('_', ' ').toUpperCase()} Encountered a State Discrepancy` : 'Console Render Intercepted'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A temporary initialization or data state mismatch was safely isolated. You can retry rendering or reset local session cache below.
            </p>
          </div>

          {this.state.error?.message && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-left space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Captured Error Trace</span>
              <p className="text-[11px] font-mono text-rose-400 break-words line-clamp-3">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleRetry}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 px-4 rounded-xl border border-slate-700 transition-all active:scale-98 cursor-pointer"
            >
              🔄 Retry View
            </button>
            <button
              onClick={this.handleHardReset}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-98 cursor-pointer"
            >
              🧹 Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

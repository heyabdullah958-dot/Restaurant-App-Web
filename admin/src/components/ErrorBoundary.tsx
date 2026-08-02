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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      try {
        sessionStorage.clear();
      } catch (e) {}
      window.location.hash = '#branch_dashboard';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 my-6 max-w-lg mx-auto font-sans">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-white">
              {this.props.viewName ? `${this.props.viewName} Section Encountered an Issue` : 'Dashboard Encountered an Issue'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A temporary render loop or data mismatch was intercepted. Click below to recover cleanly.
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
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-98 cursor-pointer"
            >
              🔄 Reset View & Resume Operation
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

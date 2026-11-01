import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        role="alert"
        className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4"
      >
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-300">
          The page ran into an unexpected error. Reloading usually helps.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="self-start rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
        >
          Reload page
        </button>
      </div>
    );
  }
}

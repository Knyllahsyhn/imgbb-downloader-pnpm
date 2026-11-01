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
        className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 text-ink"
      >
        <h1 className="label-display text-5xl">Something went wrong</h1>
        <p className="text-sm">The page ran into an unexpected error. Reloading usually helps.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="label-caps self-start border-2 border-ink bg-signal px-6 py-3 text-base text-on-signal hover:brightness-95"
        >
          Reload page
        </button>
      </div>
    );
  }
}

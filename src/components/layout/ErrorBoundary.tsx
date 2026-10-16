import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ReportFlow render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="font-display text-4xl text-paper">Something broke</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Reload the page. If this keeps happening after a deploy, check
              Lovable Cloud keys in `.env.local`.
            </p>
            <button
              type="button"
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => window.location.assign("/")}
            >
              Back home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

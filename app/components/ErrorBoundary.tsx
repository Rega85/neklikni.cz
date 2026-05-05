"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="surface-card p-6 m-4 text-center text-slate-300">
            <AlertTriangle className="mx-auto text-yellow-400 mb-2" size={28} />
            <p className="font-semibold">Tahle sekce se nepodařilo načíst.</p>
            <p className="text-sm text-slate-500 mt-1">Zkus stránku znovu načíst — zbytek funguje normálně.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

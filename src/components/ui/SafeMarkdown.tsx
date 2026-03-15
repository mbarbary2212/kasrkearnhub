import { Component, type ReactNode } from 'react';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallbackText: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[SafeMarkdown] Rendering failed, falling back to plain text:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
          {this.props.fallbackText}
        </pre>
      );
    }
    return this.props.children;
  }
}

export type SafeMarkdownProps = ReactMarkdownOptions;

export function SafeMarkdown(props: SafeMarkdownProps) {
  const rawText = typeof props.children === 'string' ? props.children : '';

  return (
    <MarkdownErrorBoundary fallbackText={rawText}>
      <ReactMarkdown {...props} />
    </MarkdownErrorBoundary>
  );
}

import { Component } from "react";

/**
 * ErrorBoundary: Catches unhandled React render errors and shows a friendly fallback UI.
 * Usage: Wrap any subtree in <ErrorBoundary> to prevent the whole app from crashing.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback } = this.props;

    if (fallback) {
      return typeof fallback === "function"
        ? fallback({ error: this.state.error, reset: this.handleReset })
        : fallback;
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "40px 20px",
          textAlign: "center",
          background: "rgba(239,68,68,0.04)",
          borderRadius: 20,
          border: "1px solid rgba(239,68,68,0.12)",
          margin: 24,
        }}
      >
        <p style={{ fontSize: 48 }}>⚠️</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, color: "var(--text)" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--text-muted, #94a3b8)", marginTop: 8, maxWidth: 420 }}>
          An unexpected error occurred in this section. Your data is safe — this is a display issue.
        </p>
        {this.state.error?.message && (
          <code
            style={{
              display: "block",
              marginTop: 16,
              padding: "8px 16px",
              background: "rgba(239,68,68,0.08)",
              borderRadius: 8,
              fontSize: 13,
              color: "#f87171",
              maxWidth: 480,
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </code>
        )}
        <button
          type="button"
          onClick={this.handleReset}
          style={{
            marginTop: 24,
            padding: "10px 28px",
            background: "linear-gradient(135deg, #84cc16, #22c55e)",
            color: "#0f172a",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }
}

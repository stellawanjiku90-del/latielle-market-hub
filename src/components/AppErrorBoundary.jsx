import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('LATIELLE application startup error:', error);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#fafafa', color: '#171b22' }}>
        <section style={{ maxWidth: 520, textAlign: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}>
          <div style={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: 32, lineHeight: 1.1, marginBottom: 12 }}>
            LATIELLE MARKET HUB
          </div>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>The page could not finish loading.</h1>
          <p style={{ color: '#5b6472', margin: '0 0 20px', lineHeight: 1.6 }}>
            Please refresh the page. Your account and marketplace data have not been changed by this error.
          </p>
          <button type="button" onClick={this.handleReload} style={{ padding: '11px 18px', border: '1px solid #ccd2da', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Refresh
          </button>
        </section>
      </main>
    );
  }
}

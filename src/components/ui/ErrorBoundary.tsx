import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary pour capturer les erreurs React et afficher un fallback
 * Évite que toute l'application crash en cas d'erreur dans un composant
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Callback personnalisé
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback par défaut
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="glass-card p-8 text-center">
              {/* Icon */}
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-800 mb-3">
                Une erreur est survenue
              </h1>

              {/* Message */}
              <p className="text-slate-600 mb-6">
                Nous sommes désolés, mais quelque chose s'est mal passé. L'équipe technique a été notifiée.
              </p>

              {/* Error details (en dev seulement) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left mb-6 p-4 bg-slate-100 rounded-lg">
                  <summary className="cursor-pointer font-semibold text-slate-700 mb-2">
                    Détails techniques
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <p className="font-mono text-sm text-red-600 mb-1">
                        {this.state.error.toString()}
                      </p>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Stack trace:</p>
                        <pre className="text-xs text-slate-600 overflow-auto max-h-48 p-2 bg-white rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-al-blue-500 hover:bg-al-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Réessayer
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Retour au Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version pour les composants fonctionnels (wrapper simple)
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Ici, on pourrait envoyer à un service de monitoring comme Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full glass-card p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Oups ! Une erreur est survenue
                </h1>
                <p className="text-gray-600">
                  Une erreur inattendue s'est produite. Nos équipes ont été notifiées.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-900 mb-2 text-sm">
                  Détails de l'erreur :
                </h3>
                <pre className="text-xs text-red-700 overflow-x-auto">
                  {this.state.error.message}
                </pre>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-red-600 cursor-pointer hover:underline">
                      Stack trace (développement)
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 overflow-x-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Réessayer
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Retour au dashboard
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6 text-center">
              Si le problème persiste, contactez le support technique avec la référence de l'erreur ci-dessus.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

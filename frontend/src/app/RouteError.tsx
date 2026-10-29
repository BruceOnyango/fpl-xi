import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button } from '@/components/atoms';
import { ErrorState } from '@/components/molecules';

/** Route-level error boundary and 404. */
export function RouteError() {
  const err = useRouteError();
  const notFound = isRouteErrorResponse(err) && err.status === 404;
  if (import.meta.env.DEV && !notFound) console.error(err);
  return (
    <div className="bg-bg text-text flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-display text-3xl font-bold uppercase">
        {notFound ? 'Page not found' : 'Something broke'}
      </h1>
      <ErrorState
        title={notFound ? 'Nothing lives at this address' : 'This page hit an unexpected error'}
        message={
          notFound
            ? 'Check the link, or head back to the dashboard.'
            : 'Reloading usually fixes it. If not, it’s a bug on our side.'
        }
        onRetry={notFound ? undefined : () => window.location.reload()}
      />
      <Button asChild variant="secondary">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

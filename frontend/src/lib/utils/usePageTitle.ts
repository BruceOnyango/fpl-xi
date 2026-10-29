import { useEffect } from 'react';

/** Sets document.title as "<page> · FPL XI". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · FPL XI`;
  }, [title]);
}

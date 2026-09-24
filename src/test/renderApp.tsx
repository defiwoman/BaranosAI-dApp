import { render } from '@testing-library/react';
import { App } from '../App';
import { RouterProvider } from '../router';
import { ProgressProvider } from '../progressContext';

export function renderApp(path = '/') {
  window.history.replaceState(null, '', path);
  return render(
    <RouterProvider>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </RouterProvider>,
  );
}

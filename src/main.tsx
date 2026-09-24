import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { RouterProvider } from './router';
import { ProgressProvider } from './progressContext';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </RouterProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/tema.css';
import { chiediPersistenza, ripristinaDaIndexedDB } from './stato/persistenza';

// Prima di montare: se localStorage è stato svuotato ma IndexedDB ha la copia, la ripristina.
ripristinaDaIndexedDB().finally(() => {
  void chiediPersistenza();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

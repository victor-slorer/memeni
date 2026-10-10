import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

// No StrictMode: its double-mount in dev would start every review session twice.
createRoot(document.getElementById('root')!).render(<App />);

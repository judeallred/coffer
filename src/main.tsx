import { render } from 'preact';
import { App } from './components/App.tsx';

// Initialize the application
const root = document.getElementById('root');
if (root) {
  render(<App />, root);
} else {
  console.error('Failed to find root element');
}

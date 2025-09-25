import { useState, useEffect } from 'preact/hooks';
import { Header } from './Header.tsx';
import { OfferInputs } from './OfferInputs.tsx';
import { CombinedPreview } from './CombinedPreview.tsx';
import { ErrorLog } from './ErrorLog.tsx';
import { ToastContainer } from './ToastContainer.tsx';
import type { Offer, LogEntry } from '../types/index.ts';


export function App(): JSX.Element {
  const [offers, setOffers] = useState<Offer[]>([
    { id: '1', content: '', isValid: false },
    { id: '2', content: '', isValid: false },
    { id: '3', content: '', isValid: false },
    { id: '4', content: '', isValid: false },
    { id: '5', content: '', isValid: false },
  ]);

  const [combinedOffer, _setCombinedOffer] = useState<string>('');
  const [errorLogs, setErrorLogs] = useState<LogEntry[]>([]);

  const updateOffer = (id: string, content: string): void => {
    setOffers(prev => prev.map(offer => 
      offer.id === id 
        ? { ...offer, content, isValid: false, error: undefined, parsedData: undefined }
        : offer
    ));

    // Auto-expand: add new row if all current rows are filled
    const allFilled = offers.every(offer => offer.content.trim() !== '');
    if (allFilled && content.trim() !== '') {
      const newId = String(offers.length + 1);
      setOffers(prev => [...prev, { id: newId, content: '', isValid: false }]);
    }
  };

  const logError = (message: string, type: 'error' | 'warning' | 'info' = 'error'): void => {
    const newLog = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      type,
    };
    setErrorLogs(prev => [...prev, newLog]);
  };

  // Initialize the Chia Wallet SDK WASM module
  useEffect(() => {
    const initSDK = async (): Promise<void> => {
      try {
        const { initWalletSDK, isUsingMockMode } = await import('../services/walletSDK.ts');
        await initWalletSDK();
        
        if (isUsingMockMode()) {
          logError('Running in mock validation mode - WASM not available', 'warning');
        } else {
          logError('Chia Wallet SDK WASM initialized successfully', 'info');
        }
      } catch (error) {
        logError(`Failed to initialize Chia Wallet SDK: ${error}`, 'error');
      }
    };

    initSDK();
  }, []);

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <div className="content-grid">
          <OfferInputs 
            offers={offers}
            onUpdateOffer={updateOffer}
            onLogError={logError}
            setOffers={setOffers}
          />
          <CombinedPreview 
            offers={offers.filter(o => o.isValid)}
            combinedOffer={combinedOffer}
            onLogError={logError}
          />
        </div>
      </main>
      <ErrorLog logs={errorLogs} />
      <ToastContainer />
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import { Header } from './Header.tsx';
import { SimpleOfferInputs } from './SimpleOfferInputs.tsx';
import { SimpleCombinedOutput } from './SimpleCombinedOutput.tsx';
import { ErrorLog } from './ErrorLog.tsx';
import { ToastContainer, showToast } from './ToastContainer.tsx';
import type { Offer, LogEntry } from '../types/index.ts';

const STORAGE_KEY = 'coffer-offers';

export function App(): JSX.Element {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [errorLogs, setErrorLogs] = useState<LogEntry[]>([]);

  // Load offers from localStorage on startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedOffers = JSON.parse(stored) as Offer[];
        setOffers(parsedOffers);
        logError(`Loaded ${parsedOffers.length} offers from storage`, 'info');
      }
    } catch (error) {
      logError('Failed to load offers from storage', 'warning');
    }
  }, []);

  // Save offers to localStorage whenever offers change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
    } catch (error) {
      logError('Failed to save offers to storage', 'warning');
    }
  }, [offers]);

  const validateOffer = async (content: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
      const { validateOffer: validateOfferSDK } = await import('../services/walletSDK.ts');
      const result = await validateOfferSDK(content);
      
      return {
        isValid: result.isValid,
        error: result.error
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  };

  const addOffer = async (content: string): Promise<void> => {
    // Check for duplicate content
    const isDuplicate = offers.some(offer => offer.content === content);
    if (isDuplicate) {
      throw new Error('This offer has already been added');
    }

    // Generate new ID
    const newId = String(Date.now());
    
    // Validate the offer
    const validation = await validateOffer(content);
    
    const newOffer: Offer = {
      id: newId,
      content,
      isValid: validation.isValid,
      error: validation.error
    };

    setOffers(prev => [...prev, newOffer]);

    if (!validation.isValid && validation.error) {
      logError(`Offer validation failed: ${validation.error}`, 'error');
    }
  };

  const deleteOffer = (id: string): void => {
    setOffers(prev => prev.filter(offer => offer.id !== id));
    logError('Offer removed', 'info');
  };

  const clearAllOffers = (): void => {
    setOffers([]);
    logError('All offers cleared', 'info');
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
        const { initWalletSDK } = await import('../services/walletSDK.ts');
        await initWalletSDK();
        
        logError('Chia Wallet SDK WASM initialized successfully', 'info');
      } catch (error) {
        logError(`Failed to initialize Chia Wallet SDK: ${error}`, 'error');
      }
    };

    initSDK();
  }, []);

  // Global paste detection
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent): Promise<void> => {
      try {
        const clipboardData = e.clipboardData?.getData('text') || '';
        const content = clipboardData.trim();
        
        if (content && content.startsWith('offer1')) {
          e.preventDefault(); // Prevent default paste behavior
          
          // Check if this offer already exists
          const isDuplicate = offers.some(offer => offer.content === content);
          if (isDuplicate) {
            showToast('This offer has already been added', 'warning');
            logError('This offer has already been added', 'warning');
            return;
          }
          
          showToast('📋 Offer detected from paste - adding...', 'info');
          logError('Offer detected from paste - adding...', 'info');
          await addOffer(content);
          showToast('✅ Offer added successfully!', 'success');
        }
      } catch (error) {
        showToast(`Failed to process pasted content: ${error}`, 'error');
        logError(`Failed to process pasted content: ${error}`, 'error');
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [offers]); // Re-register when offers change to check for duplicates

  // Global copy handler for Ctrl+C
  useEffect(() => {
    const handleGlobalCopy = async (e: KeyboardEvent): Promise<void> => {
      // Check if Ctrl+C (or Cmd+C on Mac) was pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Only handle if we're not in an input field or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return; // Let normal copy behavior work in input fields
        }

        // If there's a text selection, let normal copy work
        if (window.getSelection()?.toString().trim()) {
          return;
        }

        // Check if there are any valid offers to combine
        const validOffers = offers.filter(offer => offer.isValid && offer.content.trim());
        if (validOffers.length > 0) {
          try {
            const { combineOffers } = await import('../services/walletSDK.ts');
            const offerStrings = validOffers.map(offer => offer.content);
            const result = await combineOffers(offerStrings);
            
            if (result.success && result.combinedOffer) {
              await navigator.clipboard.writeText(result.combinedOffer);
              showToast('📋 Combined offer copied to clipboard!', 'success', 3000);
              e.preventDefault(); // Prevent default copy behavior
            } else {
              showToast('Failed to generate combined offer', 'error');
            }
          } catch (error) {
            showToast('Failed to copy combined offer to clipboard', 'error');
            logError(`Failed to copy to clipboard: ${error}`, 'error');
          }
        } else {
          showToast('No valid offers available to copy', 'warning');
        }
      }
    };

    document.addEventListener('keydown', handleGlobalCopy);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalCopy);
    };
  }, [offers]); // Re-register when offers change

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <div className="simplified-content">
          <SimpleOfferInputs 
            offers={offers}
            onAddOffer={addOffer}
            onDeleteOffer={deleteOffer}
            onClearAll={clearAllOffers}
          />
          <SimpleCombinedOutput 
            offers={offers}
            onLogError={logError}
          />
        </div>
      </main>
      <ErrorLog logs={errorLogs} />
      <ToastContainer />
    </div>
  );
}

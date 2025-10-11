import { useEffect, useState } from 'preact/hooks';
import { Header } from './Header.tsx';
import { SimpleOfferInputs } from './SimpleOfferInputs.tsx';
import { SimpleCombinedOutput } from './SimpleCombinedOutput.tsx';
import { ErrorLog } from './ErrorLog.tsx';
import { showToast, ToastContainer } from './ToastContainer.tsx';
import type { LogEntry, Offer } from '../types/index.ts';

// Helper function to detect if a string is a 44-character base64 offer ID
function isOfferId(value: string): boolean {
  return value.length === 44 && !value.startsWith('offer1') && /^[A-Za-z0-9+/]+$/.test(value);
}

// Helper function to extract offer ID from MintGarden or Dexie URL
function extractOfferIdFromUrl(url: string): string | null {
  try {
    // Match URLs like:
    // https://mintgarden.io/offers/AqtaxKUF7UV4WKAYGr24frVMzt6xWWahTc4Xwc8EmhiK
    // https://dexie.space/offers/AqtaxKUF7UV4WKAYGr24frVMzt6xWWahTc4Xwc8EmhiK
    const urlPattern = /^https?:\/\/(mintgarden\.io|dexie\.space)\/offers\/([A-Za-z0-9+/]{44})$/;
    const match = url.match(urlPattern);
    
    if (match && match[2]) {
      return match[2];
    }
    
    return null;
  } catch {
    return null;
  }
}

// Helper function to fetch offer string from offer ID
async function fetchOfferFromId(offerId: string): Promise<string | null> {
  // Try Dexie API first
  try {
    const dexieResponse = await fetch(`https://api.dexie.space/v1/offers/${offerId}`);
    if (dexieResponse.ok) {
      const data = await dexieResponse.json();
      if (data.success && data.offer && data.offer.offer) {
        return data.offer.offer;
      }
    }
  } catch (error) {
    console.warn('Dexie API failed:', error);
  }

  // Try MintGarden API as fallback
  try {
    const mintgardenResponse = await fetch(`https://api.mintgarden.io/offers/${offerId}/bech32`);
    if (mintgardenResponse.ok) {
      const offerString = await mintgardenResponse.text();
      // Remove quotes if present
      const cleanedOffer = offerString.replace(/^"|"$/g, '');
      if (cleanedOffer.startsWith('offer1')) {
        return cleanedOffer;
      }
    }
  } catch (error) {
    console.warn('MintGarden API failed:', error);
  }

  return null;
}

export function App(): JSX.Element {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [errorLogs, setErrorLogs] = useState<LogEntry[]>([]);

  const validateOffer = async (content: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
      const { validateOffer: validateOfferSDK } = await import('../services/walletSDK.ts');
      const result = validateOfferSDK(content);

      return {
        isValid: result.isValid,
        error: result.error,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  };

  const addOffer = async (content: string): Promise<void> => {
    // Check for duplicate content
    const isDuplicate = offers.some((offer) => offer.content === content);

    // Generate new ID
    const newId = String(Date.now());

    if (isDuplicate) {
      // Add the duplicate offer with an error state
      const newOffer: Offer = {
        id: newId,
        content,
        isValid: false,
        error: 'This offer has already been added',
      };
      setOffers((prev) => [...prev, newOffer]);
      logError('Duplicate offer detected', 'warning');
      return;
    }

    // Validate the offer
    const validation = await validateOffer(content);

    const newOffer: Offer = {
      id: newId,
      content,
      isValid: validation.isValid,
      error: validation.error,
    };

    setOffers((prev) => [...prev, newOffer]);

    if (!validation.isValid && validation.error) {
      logError(`Offer validation failed: ${validation.error}`, 'error');
    }
  };

  const deleteOffer = async (id: string): Promise<void> => {
    const remainingOffers = offers.filter((offer) => offer.id !== id);

    // Re-validate all remaining offers to check for duplicates
    const revalidatedOffers = await Promise.all(
      remainingOffers.map(async (offer) => {
        // Check if this offer is now a duplicate of another remaining offer
        const isDuplicate = remainingOffers.some(
          (other) => other.id !== offer.id && other.content === offer.content,
        );

        if (isDuplicate && (!offer.error || offer.error === 'This offer has already been added')) {
          // Keep it as duplicate error
          return {
            ...offer,
            isValid: false,
            error: 'This offer has already been added',
          };
        } else if (!isDuplicate && offer.error === 'This offer has already been added') {
          // Was duplicate, now not - re-validate
          logError('Re-validating offer after duplicate removal', 'info');
          const validation = await validateOffer(offer.content);
          return {
            ...offer,
            isValid: validation.isValid,
            error: validation.error,
          };
        }

        // No change needed
        return offer;
      }),
    );

    setOffers(revalidatedOffers);
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
    setErrorLogs((prev) => [...prev, newLog]);
  };

  // Revalidate all offers
  const revalidateAllOffers = async (): Promise<void> => {
    if (offers.length === 0) return;

    const revalidatedOffers = await Promise.all(
      offers.map(async (offer) => {
        // Check if this offer is a duplicate
        const isDuplicate = offers.some(
          (other) => other.id !== offer.id && other.content === offer.content,
        );

        if (isDuplicate) {
          return {
            ...offer,
            isValid: false,
            error: 'This offer has already been added',
          };
        } else if (offer.error === 'This offer has already been added') {
          // Was duplicate, now not - re-validate
          const validation = await validateOffer(offer.content);
          return {
            ...offer,
            isValid: validation.isValid,
            error: validation.error,
          };
        }

        // No change needed
        return offer;
      }),
    );

    // Only update if something changed
    const hasChanged = revalidatedOffers.some((offer, index) =>
      offer.isValid !== offers[index].isValid || offer.error !== offers[index].error
    );

    if (hasChanged) {
      setOffers(revalidatedOffers);
    }
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

  // Revalidate all offers every 20ms
  useEffect(() => {
    const interval = setInterval(() => {
      revalidateAllOffers();
    }, 20);

    return () => clearInterval(interval);
  }, [offers]);

  // Global paste detection
  useEffect(() => {
    let lastPasteTime = 0;
    
    const handleGlobalPaste = async (e: ClipboardEvent): Promise<void> => {
      try {
        // Prevent double-paste: skip if paste happened within last 100ms
        const now = Date.now();
        if (now - lastPasteTime < 100) {
          return;
        }
        lastPasteTime = now;

        // Skip if pasting into an input field (let the field handler deal with it)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        const clipboardData = e.clipboardData?.getData('text') || '';
        let content = clipboardData.trim();

        if (!content) return;

        // Check if it's a URL with an offer ID
        const offerIdFromUrl = extractOfferIdFromUrl(content);
        
        // Check if it's an offer string, offer ID, or URL
        const isOffer = content.startsWith('offer1');
        const isPotentialOfferId = isOfferId(content) || offerIdFromUrl !== null;

        if (isOffer || isPotentialOfferId) {
          e.preventDefault(); // Prevent default paste behavior

          // If it's an offer ID or URL, try to fetch the full offer string
          if (isPotentialOfferId) {
            const offerIdToFetch = offerIdFromUrl || content;
            showToast('🔍 Fetching offer from ID...', 'info');
            logError(`Fetching offer from ${offerIdFromUrl ? 'URL' : 'ID'}...`, 'info');

            const fetchedOffer = await fetchOfferFromId(offerIdToFetch);
            if (fetchedOffer) {
              content = fetchedOffer;
              showToast('✅ Offer fetched successfully!', 'success');
            } else {
              showToast('❌ Failed to fetch offer from ID', 'error');
              logError('Failed to fetch offer from ID', 'error');
              return;
            }
          }

          // Check if this offer already exists before adding
          const isDuplicate = offers.some((offer) => offer.content === content);

          if (!isPotentialOfferId) {
            showToast('📋 Offer detected from paste - adding...', 'info');
            logError('Offer detected from paste - adding...', 'info');
          }

          await addOffer(content);

          if (isDuplicate) {
            showToast('⚠️ Duplicate offer (error shown in field)', 'warning');
          } else {
            showToast('✅ Offer added successfully!', 'success');
          }
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
        if (
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        ) {
          return; // Let normal copy behavior work in input fields
        }

        // If there's a text selection, let normal copy work
        if (globalThis.getSelection()?.toString().trim()) {
          return;
        }

        // Check if there are any valid offers to combine
        const validOffers = offers.filter((offer) => offer.isValid && offer.content.trim());
        if (validOffers.length > 0) {
          try {
            const { combineOffers } = await import('../services/walletSDK.ts');
            const offerStrings = validOffers.map((offer) => offer.content);
            const result = combineOffers(offerStrings);

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
    <div className='app-container'>
      <Header />
      <main className='main-content'>
        <div className='simplified-content'>
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

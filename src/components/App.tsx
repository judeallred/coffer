import { useEffect, useState } from 'preact/hooks';
import { Header } from './Header.tsx';
import { SimpleOfferInputs } from './SimpleOfferInputs.tsx';
import { SimpleCombinedOutput } from './SimpleCombinedOutput.tsx';
import { ErrorLog } from './ErrorLog.tsx';
import { About } from './About.tsx';
import type { LogEntry, Offer } from '../types/index.ts';
import {
  extractOfferIdFromUrl,
  fetchDexieOfferDetails,
  fetchOfferFromIdCached,
  isOfferId,
  offerStringToId,
} from '../utils/offerUtils.ts';

export function App(): JSX.Element {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [errorLogs, setErrorLogs] = useState<LogEntry[]>([]);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [isWasmInitialized, setIsWasmInitialized] = useState<boolean>(false);

  // Expose debug mode toggle to window for console access
  useEffect(() => {
    (window as typeof window & { toggleDebug?: () => void }).toggleDebug = () => {
      setIsDebugMode((prev) => {
        const newValue = !prev;
        console.log(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);
        return newValue;
      });
    };

    console.log('💡 Tip: Run toggleDebug() in the console to show/hide the application log');

    return () => {
      delete (window as typeof window & { toggleDebug?: () => void }).toggleDebug;
    };
  }, []);

  const validateOffer = async (content: string): Promise<{ isValid: boolean; error?: string }> => {
    // Wait for WASM to be initialized
    if (!isWasmInitialized) {
      return {
        isValid: false,
        error: 'WASM module is still initializing. Please wait...',
      };
    }

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
      dexieLoading: validation.isValid, // Start loading if valid
    };

    setOffers((prev) => [...prev, newOffer]);

    if (!validation.isValid && validation.error) {
      logError(`Offer validation failed: ${validation.error}`, 'error');
    }

    // Fetch Dexie data if offer is valid
    if (validation.isValid) {
      try {
        const offerId = await offerStringToId(content);
        if (offerId) {
          const dexieData = await fetchDexieOfferDetails(offerId);
          setOffers((prev) =>
            prev.map((offer) =>
              offer.id === newId ? { ...offer, dexieData, dexieLoading: false } : offer
            )
          );
        } else {
          // Failed to convert offer to ID
          setOffers((prev) =>
            prev.map((offer) => offer.id === newId ? { ...offer, dexieLoading: false } : offer)
          );
        }
      } catch (error) {
        console.error('Failed to fetch Dexie data:', error);
        setOffers((prev) =>
          prev.map((offer) => offer.id === newId ? { ...offer, dexieLoading: false } : offer)
        );
      }
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

          // Create updated offer
          const updatedOffer = {
            ...offer,
            isValid: validation.isValid,
            error: validation.error,
            dexieLoading: validation.isValid, // Start loading if valid
          };

          // Fetch Dexie data if offer is valid
          if (validation.isValid) {
            // Use setTimeout to fetch Dexie data after re-validation completes
            setTimeout(async () => {
              try {
                const offerId = await offerStringToId(offer.content);
                if (offerId) {
                  const dexieData = await fetchDexieOfferDetails(offerId);
                  setOffers((prev) =>
                    prev.map((o) =>
                      o.id === offer.id ? { ...o, dexieData, dexieLoading: false } : o
                    )
                  );
                } else {
                  setOffers((prev) =>
                    prev.map((o) => o.id === offer.id ? { ...o, dexieLoading: false } : o)
                  );
                }
              } catch (error) {
                console.error('Failed to fetch Dexie data:', error);
                setOffers((prev) =>
                  prev.map((o) => o.id === offer.id ? { ...o, dexieLoading: false } : o)
                );
              }
            }, 0);
          }

          return updatedOffer;
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

  const clearLogs = (): void => {
    setErrorLogs([]);
  };

  // Revalidate all offers
  const revalidateAllOffers = async (): Promise<void> => {
    if (offers.length === 0 || !isWasmInitialized) return;

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

        setIsWasmInitialized(true);
        logError('Chia Wallet SDK WASM initialized successfully', 'info');
      } catch (error) {
        logError(`Failed to initialize Chia Wallet SDK: ${error}`, 'error');
        setIsWasmInitialized(false);
      }
    };

    initSDK();
  }, []);

  // Revalidate all offers periodically (every 500ms)
  useEffect(() => {
    // Don't start revalidation until WASM is initialized
    if (!isWasmInitialized) return;

    const interval = setInterval(() => {
      revalidateAllOffers();
    }, 500);

    return () => clearInterval(interval);
  }, [offers, isWasmInitialized]);

  // Global paste detection
  useEffect(() => {
    let lastPasteTime = 0;

    const handleGlobalPaste = async (e: ClipboardEvent): Promise<void> => {
      try {
        // Check if WASM is initialized before processing paste
        if (!isWasmInitialized) {
          logError('Please wait for WASM module to initialize before adding offers', 'warning');
          return;
        }

        // Prevent double-paste: skip if paste happened within last 100ms
        const now = Date.now();
        if (now - lastPasteTime < 100) {
          return;
        }
        lastPasteTime = now;

        // Skip if pasting into an input field (let the field handler deal with it)
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        ) {
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
            logError(`Fetching offer from ${offerIdFromUrl ? 'URL' : 'ID'}...`, 'info');

            const fetchedOffer = await fetchOfferFromIdCached(offerIdToFetch);
            if (fetchedOffer) {
              content = fetchedOffer;
              logError('Offer fetched successfully!', 'info');
            } else {
              logError('Failed to fetch offer from ID', 'error');
              return;
            }
          }

          // Check if this offer already exists before adding
          const isDuplicate = offers.some((offer) => offer.content === content);

          if (!isPotentialOfferId) {
            logError('Offer detected from paste - adding...', 'info');
          }

          await addOffer(content);

          if (isDuplicate) {
            logError('Duplicate offer (error shown in field)', 'warning');
          } else {
            logError('Offer added successfully!', 'info');
          }
        }
      } catch (error) {
        logError(`Failed to process pasted content: ${error}`, 'error');
      }
    };

    document.addEventListener('paste', handleGlobalPaste);

    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [offers, isWasmInitialized]); // Re-register when offers or init state changes

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

        // Check if WASM is initialized
        if (!isWasmInitialized) {
          logError('WASM module is still initializing. Please wait...', 'warning');
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
              logError('Combined offer copied to clipboard!', 'info');
              e.preventDefault(); // Prevent default copy behavior
            } else {
              logError('Failed to generate combined offer', 'error');
            }
          } catch (error) {
            logError(`Failed to copy to clipboard: ${error}`, 'error');
          }
        } else {
          logError('No valid offers available to copy', 'warning');
        }
      }
    };

    document.addEventListener('keydown', handleGlobalCopy);

    return () => {
      document.removeEventListener('keydown', handleGlobalCopy);
    };
  }, [offers, isWasmInitialized]); // Re-register when offers or init state changes

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
            disabled={!isWasmInitialized}
          />
          <SimpleCombinedOutput
            offers={offers}
            onLogError={logError}
            disabled={!isWasmInitialized}
          />
        </div>
      </main>
      <ErrorLog logs={errorLogs} isDebugMode={isDebugMode} onClearLogs={clearLogs} />
      <About />
    </div>
  );
}

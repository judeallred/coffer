import { useState } from 'preact/hooks';
import styled from 'styled-components';
import { Header } from './Header.tsx';
import { OfferInputs } from './OfferInputs.tsx';
import { CombinedPreview } from './CombinedPreview.tsx';
import { ErrorLog } from './ErrorLog.tsx';
import { ToastContainer } from './ToastContainer.tsx';
import type { Offer, LogEntry } from '../types/index.ts';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
`;

const MainContent = styled.main`
  flex: 1;
  padding: var(--spacing-xl) 0;
`;

const ContentGrid = styled.div`
  display: grid;
  gap: var(--spacing-2xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);

  @media (min-width: 768px) {
    padding: 0 var(--spacing-lg);
  }
`;


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

  return (
    <AppContainer>
      <Header />
      <MainContent>
        <ContentGrid>
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
        </ContentGrid>
      </MainContent>
      <ErrorLog logs={errorLogs} />
      <ToastContainer />
    </AppContainer>
  );
}

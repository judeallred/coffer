import { useEffect, useState } from 'preact/hooks';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Header(): JSX.Element {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState<boolean>(false);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event): void => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install button
      setShowInstallButton(true);
    };

    globalThis.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (globalThis.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async (): Promise<void> => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    <header className='header'>
      <div className='header-content'>
        <div className='logo'>
          <div className='logo-image-container'>
            <img src='./assets/coffer.png' alt='Coffer Logo' className='logo-image' />
          </div>
          <div className='logo-text'>
            <h1 className='title'>Coffer</h1>
            <p className='subtitle'>Combine Chia offers with ease</p>
          </div>
        </div>
        {showInstallButton && (
          <button className='install-app-button' onClick={handleInstallClick} type='button'>
            📲 Install App
          </button>
        )}
      </div>
    </header>
  );
}

import { useEffect, useState } from 'preact/hooks';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Header(): JSX.Element {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallIcon, setShowInstallIcon] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check if we're on mobile
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
    setIsMobile(mobileCheck);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event): void => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install icon only on mobile
      if (mobileCheck) {
        setShowInstallIcon(true);
      }
    };

    globalThis.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (globalThis.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallIcon(false);
    }

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleLogoClick = async (): Promise<void> => {
    // Only handle click if on mobile with available prompt
    if (!isMobile || !deferredPrompt) {
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
    setShowInstallIcon(false);
  };

  return (
    <header className='header'>
      <div className='header-content'>
        <div className='logo'>
          <div
            className={`logo-image-container ${isMobile && deferredPrompt ? 'clickable' : ''}`}
            onClick={handleLogoClick}
            role={isMobile && deferredPrompt ? 'button' : undefined}
            tabIndex={isMobile && deferredPrompt ? 0 : undefined}
            onKeyDown={(e: KeyboardEvent) => {
              if ((e.key === 'Enter' || e.key === ' ') && isMobile && deferredPrompt) {
                e.preventDefault();
                handleLogoClick();
              }
            }}
          >
            <img src='./assets/coffer.png' alt='Coffer Logo' className='logo-image' />
            {showInstallIcon && (
              <div className='download-icon-overlay' title='Install Coffer app'>
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='download-icon'
                >
                  {/* Down arrow */}
                  <path d='M12 3v12' />
                  <path d='M8 11l4 4 4-4' />
                  {/* Box/tray */}
                  <path d='M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4' />
                  <path d='M7 15h10' />
                </svg>
              </div>
            )}
          </div>
          <div className='logo-text'>
            <h1 className='title'>Coffer</h1>
            <p className='subtitle'>Combine Chia offers with ease</p>
          </div>
        </div>
      </div>
    </header>
  );
}

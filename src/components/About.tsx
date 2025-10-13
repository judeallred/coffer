export function About(): JSX.Element {
  const tipAddress = 'xch19yjw7gf8vs2c8syrryavnmgkya7ly0xafd8yqq7twgzh36kvlzqsl33cem';

  return (
    <section className='about-section'>
      <div className='about-content'>
        <p className='made-by'>
          Made with 🌱 and 🤖 by{' '}
          <a href='https://twitter.com/blinkymach12' target='_blank' rel='noopener noreferrer'>
            @blinkymach12
          </a>
        </p>
        <p className='thanks'>
          With thanks to the{' '}
          <a
            href='https://github.com/Rigidity/chia-wallet-sdk'
            target='_blank'
            rel='noopener noreferrer'
          >
            Chia Wallet SDK
          </a>
          , and the{' '}
          <a href='https://dexie.space' target='_blank' rel='noopener noreferrer'>
            Dexie
          </a>{' '}
          and{' '}
          <a href='https://mintgarden.io' target='_blank' rel='noopener noreferrer'>
            MintGarden
          </a>{' '}
          APIs
        </p>
        <div className='tip-jar'>
          <p className='tip-label'>
            Tip Jar: <code>{tipAddress}</code>
          </p>
          <div className='qr-code-container'>
            <img
              src='./assets/tip-qr-code.png'
              alt='Tip address QR code'
              className='qr-code'
            />
          </div>
        </div>
      </div>
    </section>
  );
}

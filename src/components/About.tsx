export function About(): JSX.Element {
  const tipAddress = 'xch19yjw7gf8vs2c8syrryavnmgkya7ly0xafd8yqq7twgzh36kvlzqsl33cem';

  return (
    <section className='about-section'>
      <div className='about-content'>
        <div className='about-info-section'>
          <h2 className='about-heading'>What are Chia Offers?</h2>
          <p className='about-text'>
            Chia offers are peer-to-peer, trustless trades on the Chia blockchain. They allow you to
            propose exchanges of assets (XCH, CATs, NFTs) without requiring a centralized exchange
            or intermediary. Offers are cryptographically signed and can only be accepted by someone
            who can fulfill the exact terms you specify.
          </p>
        </div>

        <div className='about-info-section'>
          <h2 className='about-heading'>Why Combine Offers?</h2>
          <p className='about-text'>
            Combining offers unlocks powerful capabilities that go beyond simple trades. Here are
            some practical use cases:
          </p>
          <div className='use-cases'>
            <div className='use-case'>
              <h4 className='use-case-title'>1. All-or-Nothing Bundle</h4>
              <p className='use-case-text'>
                You want to accept 3 offers but only if you can accept all of them at once. By
                combining them, the entire bundle will either succeed or fail together - no partial
                execution.
              </p>
            </div>
            <div className='use-case'>
              <h4 className='use-case-title'>2. Batch Transaction Efficiency</h4>
              <p className='use-case-text'>
                You want to accept 10 offers but complete them in a single transaction. Combining
                allows you to sign a single transaction and complete all of the offers in a single
                coin spend.
              </p>
            </div>
            <div className='use-case'>
              <h4 className='use-case-title'>3. Cross-Market Trading</h4>
              <p className='use-case-text'>
                You need an intermediate coin to reach your desired asset. For example: you have
                1000 XCS and want DBX, but there's no direct XCS ↔ DBX market. However, there are
                XCS ↔ SBX and SBX ↔ DBX markets. By combining offers for XCS → SBX and SBX → DBX,
                you create a single XCS → DBX offer. If the amounts don't align perfectly (e.g.,
                1000 XCS → 1200 SBX, 1000 SBX → 1000 DBX), the combined offer will show the true
                final state: 1000 XCS → 1000 DBX + 200 SBX.
              </p>
            </div>
            <div className='use-case'>
              <h4 className='use-case-title'>4. Market Making and Arbitrage</h4>
              <p className='use-case-text'>
                Combining offers enables market making and arbitrage operations as single
                fill-or-kill transactions. This means the combined offer will either execute
                completely or not at all - no partial fills. For example: if you find offer A (1000
                SBX → 1200 DBX) and offer B (1000 DBX → 1200 SBX), combining them creates an offer
                where the inputs are essentially nothing (though you may need at least one SBX and
                DBX coin in your wallet) and the outputs are 200 DBX + 200 SBX. If you successfully
                use this tool for market making or arbitrage, consider supporting the tip jar.
              </p>
            </div>
          </div>
        </div>

        <div className='about-info-section'>
          <h2 className='about-heading'>How to Use This App</h2>
          <div className='about-steps'>
            <div className='about-step'>
              <div className='step-number'>1</div>
              <div className='step-content'>
                <h3 className='step-title'>Get Your Offers</h3>
                <p className='step-text'>
                  Retrieve offer strings from marketplaces like{' '}
                  <a href='https://dexie.space' target='_blank' rel='noopener noreferrer'>
                    dexie
                  </a>{' '}
                  or{' '}
                  <a href='https://mintgarden.io' target='_blank' rel='noopener noreferrer'>
                    MintGarden
                  </a>
                  , or get them directly from other users via peer-to-peer communication (Discord,
                  email, etc.). Offers start with "offer1".
                </p>
              </div>
            </div>

            <div className='about-step'>
              <div className='step-number'>2</div>
              <div className='step-content'>
                <h3 className='step-title'>Paste Into Coffer</h3>
                <p className='step-text'>
                  Paste or type each offer into the input fields above. You can paste anywhere on
                  the page, or use the input fields directly. Coffer will validate each offer and
                  show you information from dexie (if available).
                </p>
              </div>
            </div>

            <div className='about-step'>
              <div className='step-number'>3</div>
              <div className='step-content'>
                <h3 className='step-title'>Copy Combined Offer</h3>
                <p className='step-text'>
                  Once you've added all the offers you want to combine, click the copy button (or
                  press Ctrl+C/Cmd+C) to copy the combined offer string to your clipboard.
                </p>
              </div>
            </div>

            <div className='about-step'>
              <div className='step-number'>4</div>
              <div className='step-content'>
                <h3 className='step-title'>Accept in Your Wallet</h3>
                <p className='step-text'>
                  Open your Chia wallet and paste the combined offer to view and accept it.{' '}
                  <strong className='wallet-authority'>
                    The final state displayed in your wallet is the ultimate authority on what the
                    offer will do - always review your wallet's display of the combined offer before
                    confirming.
                  </strong>{' '}
                  Your wallet will show you exactly what you'll send and receive before you confirm.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='about-divider'></div>

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
            dexie
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

        <div className='legal-disclaimer-box'>
          <p className='legal-disclaimer-text'>
            <strong>Legal Disclaimer:</strong>{' '}
            This platform provides a tool for combining Chia blockchain offers submitted by users.
            We do not operate as a regulated financial service provider, broker, or exchange under
            any framework. We do not endorse, verify, or guarantee the validity, legality, or safety
            of any offer or transaction. All offers are user-generated and processed
            cryptographically without our involvement. Blockchain transactions carry inherent
            financial and technical risks and may be subject to regulatory restrictions in your
            jurisdiction. By using this tool, you acknowledge and accept full responsibility for all
            transactions and waive any claims against the platform operators. Use at your own risk.
            Nothing on this site constitutes trading advice.
          </p>
        </div>
      </div>
    </section>
  );
}

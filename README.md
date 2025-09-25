# coffer
A simple utility website for combining Chia offers


# About
Coffer is single page static website which uses the Chia Wallet SDK's wasm bindings to run chia wallet commands in the browser.

The site provides a column of text entries, where each row in the column is initially a blank field into which a Chia offer string can be pasted.

Below this is an offer preview which shows the inputs and outputs of the combined offer.

Below that are buttons that allow you to copy the combined offer string to your clipboard, or to download it as a files.

To accomplish the combining of the offers, the site makes use of the wasm bindigns output by the https://github.com/xch-dev/chia-wallet-sdk project.  This project is checked in as a sub-repository.

# tech stack
This project is implemented as a single-page static client side website. It uses Deno, pnpm, and preact.
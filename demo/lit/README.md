# HeartDB Lit Demo

HeartDB demo application using [Lit Elements](https://lit.dev/).

## Running

Install dependencies:

```sh
npm clean-install
```

Run:

```sh
npm run dev
```

Navigate to [http://localhost:5137](http://localhost:5137).

## Development

This demo loads HeartDB from the main project's `dist/` directory. So if you
make any changes to the HeartDB source code, you'll have to run `npm run build`
on the main project to see those changes reflected in the demo.

# Regression checks

Run the browser-independent checks first:

```sh
node --test test/extension-core.test.js
```

For the capture flow, load this directory as an unpacked extension and serve the fixture:

```sh
python3 -m http.server 8080 --directory test/fixtures
```

Open `http://localhost:8080/long-page.html`, wait for the page to finish
loading, then trigger the extension.

The resulting image must contain all nine numbered colour sections and their
lazy illustrations exactly once, with no white band between sections. Repeat at
80%, 100%, and 125% browser zoom. Also check that selecting Chinese shows
`🇨🇳 中` in both the popup and the result page.

Known boundary: the extension captures the document's primary scroll root. It
does not currently expand independently scrollable panels, virtualized lists,
or infinite feeds that add content without a defined end.

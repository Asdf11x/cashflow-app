# Run locally

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm i
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

```sh
npm run dev
```

# Open port and run online

Not stable yet, sometimes it works, sometimes not unfortunately.

```
npm run dev:tunnel
```

works more stable:
```
vite --port 5174
ngrok http 5174                                                                                                                                                                
```
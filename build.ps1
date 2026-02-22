echo "Cleaning Vite cache..."
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

echo "Running production build..."
npm run build

if ($LASTEXITCODE -eq 0) {
    echo "Build successful! Deploying to Firebase..."
    firebase deploy --only hosting
} else {
    echo "Build failed! Please check the error messages above."
}

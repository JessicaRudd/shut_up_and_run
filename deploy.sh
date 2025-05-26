#!/bin/bash

# Exit on error
set -e

echo "Building the application..."
npm run build

echo "Building Cloud Functions..."
cd functions
npm run build
cd ..

echo "Deploying to Firebase..."
firebase deploy --project shut-up-and-run

echo "Deployment complete!" 
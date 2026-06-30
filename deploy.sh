#!/bin/bash

set -e

echo "Building..."
npm run build

echo "Restarting..."
pm2 restart wowvods

echo "Done!"
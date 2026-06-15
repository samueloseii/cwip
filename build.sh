#!/usr/bin/env bash
set -e

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Build frontend
cd frontend
npm ci
npm run build
cd ..

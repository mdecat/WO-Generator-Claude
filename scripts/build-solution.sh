#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GBB WO Generator Claude — Power Platform Solution Builder
#
# Builds the React app and packages it as a Power Platform solution ZIP
# ready to import into any Dynamics 365 / Dataverse environment.
#
# Usage:
#   bash scripts/build-solution.sh
#
# Output:
#   gbbwogeneratorclaude_YYYYMMDD_HHMMSS.zip  ← import this into Power Platform
# ─────────────────────────────────────────────────────────────────────────────
set -e

SOLUTION_NAME="gbbwogeneratorclaude"
WR_LOGICAL_PREFIX="gbb_"          # Dataverse web resource name prefix
WR_PATH_PREFIX="wogenerator"      # Sub-folder within the web resource namespace
DIST_DIR="dist"
SOLUTION_DIR="solution"
WR_DIR="${SOLUTION_DIR}/WebResources/${WR_LOGICAL_PREFIX}${WR_PATH_PREFIX}"
OUTPUT_ZIP="${SOLUTION_NAME}_$(date +%Y%m%d_%H%M%S).zip"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   GBB WO Generator Claude — Solution Build Script        ║"
echo "║   Solution: GBB WO Generator Claude                      ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ── Step 1: Install dependencies ─────────────────────────────────────────────
echo ""
echo "▶ 1/4 Installing npm dependencies..."
npm install --silent

# ── Step 2: Build the React app ───────────────────────────────────────────────
echo ""
echo "▶ 2/4 Building React app (production, relative base)..."
npm run build
echo "   ✓ Build complete → ${DIST_DIR}/"

# ── Step 3: Copy into solution WebResources folder ───────────────────────────
echo ""
echo "▶ 3/4 Staging files into solution structure..."
rm -rf "${WR_DIR}"
mkdir -p "${WR_DIR}"
cp -r "${DIST_DIR}/." "${WR_DIR}/"

# Count staged files
FILE_COUNT=$(find "${WR_DIR}" -type f | wc -l | tr -d ' ')
echo "   ✓ ${FILE_COUNT} files staged → ${WR_DIR}/"

# ── Step 4: Package into ZIP ──────────────────────────────────────────────────
echo ""
echo "▶ 4/4 Creating solution ZIP..."
cd "${SOLUTION_DIR}"
zip -r "../${OUTPUT_ZIP}" . -x "*.DS_Store" -x "__MACOSX/*" -x "WebResources/.gitkeep"
cd ..

FILE_SIZE=$(du -sh "${OUTPUT_ZIP}" | cut -f1)
echo "   ✓ ${OUTPUT_ZIP} (${FILE_SIZE})"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✅ Solution packaged successfully!                      ║"
echo "║                                                          ║"
echo "║   📦 ${OUTPUT_ZIP}"
echo "║                                                          ║"
echo "║   IMPORT STEPS:                                          ║"
echo "║   1. Go to https://make.powerapps.com                    ║"
echo "║   2. Select your target environment                      ║"
echo "║   3. Solutions → Import → Upload ZIP                     ║"
echo "║   4. Complete the import wizard                          ║"
echo "║                                                          ║"
echo "║   OPEN THE APP:                                          ║"
echo "║   After import, open:                                    ║"
echo "║   Settings → Solutions → GBB WO Generator Claude        ║"
echo "║   → Web Resources → gbb_wogeneratorindex.html → Preview  ║"
echo "║                                                          ║"
echo "║   Or add to D365 sitemap as a web resource page.         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

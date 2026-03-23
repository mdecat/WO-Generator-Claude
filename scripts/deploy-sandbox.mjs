/**
 * deploy-sandbox.mjs — Build the React app, generate a Power Platform solution,
 * and import it to gbbenergysandbox.crm.dynamics.com via pac CLI.
 *
 * Usage:  node scripts/deploy-sandbox.mjs
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PAC = 'C:\\Users\\madecat\\AppData\\Local\\Microsoft\\PowerAppsCli\\Microsoft.PowerApps.CLI.2.4.1\\tools\\pac.exe';

const AUTH_PROFILE    = 'gbb-energy-profile';
const TARGET_ORG      = 'gbbenergysandbox.crm.dynamics.com';

const PUBLISHER_UNIQUE_NAME = 'mdecat';
const PUBLISHER_PREFIX      = 'mdecat';
const WR_FOLDER             = 'wogenerator';   // → mdecat_wogenerator/...

const SOLUTION_NAME     = 'gbbwogeneratorclaude';
const SOLUTION_DISPLAY  = 'GBB WO Generator Claude';
const SOL_VERSION       = '1.0.0.0';

// Web resource type codes
const WR_TYPES = {
  '.html': 1,
  '.css':  2,
  '.js':   3,
  '.xml':  4,
  '.png':  5,
  '.jpg':  6,
  '.gif':  7,
  '.ico':  10,
  '.resx': 12,
  // SVG (type 11) excluded — causes NullRef in this org
};

// ── helpers ──────────────────────────────────────────────────────────────────

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...collectFiles(full));
    else results.push(full);
  }
  return results;
}

function makeWrFileName(logicalName, guid) {
  const base = logicalName.replace(/\//g, '').replace(/\./g, '');
  return base + guid.toUpperCase();
}

// ─── Step 1: Build ───────────────────────────────────────────────────────────
console.log('\n▶ 1/4  Building React app...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, VITE_FORCE_XRM: 'true' } });
console.log('   ✓ Build complete');

// ─── Step 2: Collect dist files ──────────────────────────────────────────────
console.log('\n▶ 2/4  Collecting files...');

const distFiles = collectFiles(DIST);

const webResources = distFiles
  .filter(filePath => extname(filePath).toLowerCase() !== '.svg')
  .map(filePath => {
    const rel = relative(DIST, filePath).replace(/\\/g, '/');
    const logicalName = `${PUBLISHER_PREFIX}_${WR_FOLDER}/${rel}`;
    const ext = extname(filePath).toLowerCase();
    const wrType = WR_TYPES[ext] ?? 3;
    const displayName = rel.split('/').pop() ?? rel;
    const guidLower = randomUUID();
    const guid = guidLower.toUpperCase();
    const wrFileName = makeWrFileName(logicalName, guid);
    return { filePath, rel, logicalName, ext, wrType, displayName, guidLower, guid, wrFileName };
  });

console.log(`   ✓ ${webResources.length} web resources to deploy`);

// ─── Step 3: Build solution ZIP structure ────────────────────────────────────
console.log('\n▶ 3/4  Generating solution package...');

const SOL_TEMP = join(ROOT, '.sol_build');
rmSync(SOL_TEMP, { recursive: true, force: true });
mkdirSync(join(SOL_TEMP, 'WebResources'), { recursive: true });

const rootComponents = webResources
  .map(wr => `      <RootComponent type="61" schemaName="${wr.logicalName}" behavior="0" />`)
  .join('\n');

const ORG_VERSION = '9.2.26024.146';

const solutionXml = `<ImportExportXml version="${ORG_VERSION}" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" OrganizationVersion="${ORG_VERSION}" OrganizationSchemaType="Full" CRMServerServiceabilityVersion="9.2.26032.00144">
  <SolutionManifest>
    <UniqueName>${SOLUTION_NAME}</UniqueName>
    <LocalizedNames>
      <LocalizedName description="${SOLUTION_DISPLAY}" languagecode="1033" />
    </LocalizedNames>
    <Descriptions>
      <Description description="Enterprise Work Order Generator for Dynamics 365 Field Service" languagecode="1033" />
    </Descriptions>
    <Version>${SOL_VERSION}</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>${PUBLISHER_UNIQUE_NAME}</UniqueName>
      <LocalizedNames>
        <LocalizedName description="${PUBLISHER_UNIQUE_NAME}" languagecode="1033" />
      </LocalizedNames>
      <Descriptions>
        <Description description="${PUBLISHER_UNIQUE_NAME} publisher" languagecode="1033" />
      </Descriptions>
      <EMailAddress></EMailAddress>
      <SupportingWebsiteUrl></SupportingWebsiteUrl>
      <CustomizationPrefix>${PUBLISHER_PREFIX}</CustomizationPrefix>
      <CustomizationOptionValuePrefix>10000</CustomizationOptionValuePrefix>
      <Addresses>
        <Address>
          <AddressNumber>1</AddressNumber>
          <AddressTypeCode>1</AddressTypeCode>
          <City xsi:nil="true"></City>
          <County xsi:nil="true"></County>
          <Country xsi:nil="true"></Country>
          <Fax xsi:nil="true"></Fax>
          <FreightTermsCode xsi:nil="true"></FreightTermsCode>
          <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>
          <Latitude xsi:nil="true"></Latitude>
          <Line1 xsi:nil="true"></Line1>
          <Line2 xsi:nil="true"></Line2>
          <Line3 xsi:nil="true"></Line3>
          <Longitude xsi:nil="true"></Longitude>
          <Name xsi:nil="true"></Name>
          <PostalCode xsi:nil="true"></PostalCode>
          <PostOfficeBox xsi:nil="true"></PostOfficeBox>
          <PrimaryContactName xsi:nil="true"></PrimaryContactName>
          <ShippingMethodCode xsi:nil="true"></ShippingMethodCode>
          <StateOrProvince xsi:nil="true"></StateOrProvince>
          <Telephone1 xsi:nil="true"></Telephone1>
          <Telephone2 xsi:nil="true"></Telephone2>
          <Telephone3 xsi:nil="true"></Telephone3>
          <TimeZoneRuleVersionNumber xsi:nil="true"></TimeZoneRuleVersionNumber>
          <UPSZone xsi:nil="true"></UPSZone>
          <UTCOffset xsi:nil="true"></UTCOffset>
          <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>
        </Address>
      </Addresses>
    </Publisher>
    <RootComponents>
${rootComponents}
    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>`;

writeFileSync(join(SOL_TEMP, 'solution.xml'), solutionXml, 'utf8');

const wrEntries = webResources.map(wr => `    <WebResource>
      <WebResourceId>{${wr.guidLower}}</WebResourceId>
      <Name>${wr.logicalName}</Name>
      <DisplayName>${wr.displayName}</DisplayName>
      <LanguageCode>1033</LanguageCode>
      <WebResourceType>${wr.wrType}</WebResourceType>
      <IntroducedVersion>${SOL_VERSION}</IntroducedVersion>
      <IsEnabledForMobileClient>0</IsEnabledForMobileClient>
      <IsAvailableForMobileOffline>0</IsAvailableForMobileOffline>
      <IsCustomizable>1</IsCustomizable>
      <CanBeDeleted>1</CanBeDeleted>
      <IsHidden>0</IsHidden>
      <FileName>/WebResources/${wr.wrFileName}</FileName>
    </WebResource>`).join('\n');

const customizationsXml = `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" OrganizationVersion="${ORG_VERSION}" OrganizationSchemaType="Full" CRMServerServiceabilityVersion="9.2.26032.00144">
  <Entities></Entities>
  <Roles></Roles>
  <Workflows></Workflows>
  <FieldSecurityProfiles></FieldSecurityProfiles>
  <Templates />
  <EntityMaps />
  <EntityRelationships />
  <OrganizationSettings />
  <optionsets />
  <WebResources>
${wrEntries}
  </WebResources>
  <CustomControls />
  <EntityDataProviders />
  <Languages>
    <Language>1033</Language>
  </Languages>
</ImportExportXml>`;

writeFileSync(join(SOL_TEMP, 'customizations.xml'), customizationsXml, 'utf8');

const overrides = webResources
  .map(wr => `<Override PartName="/WebResources/${wr.wrFileName}" ContentType="application/octet-stream" />`)
  .join('');
const contentTypesXml = `\uFEFF<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/octet-stream" />${overrides}</Types>`;
writeFileSync(join(SOL_TEMP, '[Content_Types].xml'), contentTypesXml, 'utf8');

for (const wr of webResources) {
  writeFileSync(join(SOL_TEMP, 'WebResources', wr.wrFileName), readFileSync(wr.filePath));
}

console.log('   ✓ Solution structure ready');

// ─── Step 4: Create ZIP and import ───────────────────────────────────────────
console.log(`\n▶ 4/4  Importing solution to ${TARGET_ORG}...`);

const ZIP_PATH = join(ROOT, `${SOLUTION_NAME}_deploy.zip`);
try { rmSync(ZIP_PATH, { force: true }); } catch { /* ignore */ }

const pyEntries = [
  ['solution.xml', join(SOL_TEMP, 'solution.xml')],
  ['customizations.xml', join(SOL_TEMP, 'customizations.xml')],
  ...webResources.map(wr => [`WebResources/${wr.wrFileName}`, join(SOL_TEMP, 'WebResources', wr.wrFileName)]),
  ['[Content_Types].xml', join(SOL_TEMP, '[Content_Types].xml')],
];
let pyScript = `import zipfile\nwith zipfile.ZipFile(r'${ZIP_PATH.replace(/\\/g, '\\\\')}', 'w', zipfile.ZIP_DEFLATED) as z:\n`;
for (const [entry, fp] of pyEntries) {
  pyScript += `  z.write(r'${fp.replace(/\\/g, '\\\\')}', '${entry}')\n`;
}
const PY_PATH = join(ROOT, '.makzip.py');
writeFileSync(PY_PATH, pyScript, 'utf8');
execSync(`python "${PY_PATH}"`, { stdio: 'inherit' });
console.log(`   ✓ Package created: ${SOLUTION_NAME}_deploy.zip`);

// Switch to sandbox auth profile
execSync(`"${PAC}" auth select --name ${AUTH_PROFILE}`, { stdio: 'inherit' });

console.log(`   ↑ Uploading to ${TARGET_ORG}...`);

const importResult = spawnSync(
  PAC,
  ['solution', 'import', '--path', ZIP_PATH, '--force-overwrite', '--publish-changes', '--async'],
  { encoding: 'utf8', cwd: ROOT }
);

console.log(importResult.stdout || '');
if (importResult.stderr) console.error(importResult.stderr);

// Restore decat as default profile
execSync(`"${PAC}" auth select --name decat-profile`, { stdio: 'inherit' });

if (importResult.status !== 0) {
  console.error('\n❌ Import failed. Check the output above for details.');
  process.exit(1);
}

// Cleanup
rmSync(SOL_TEMP, { recursive: true, force: true });
try { rmSync(PY_PATH, { force: true }); } catch { /* ignore */ }

console.log(`
╔══════════════════════════════════════════════════════════╗
║  ✅  Deployment complete!                                 ║
║                                                          ║
║  Open the app in D365 (Energy Gold Sandbox):             ║
║  Settings → Solutions → GBB WO Generator Claude          ║
║  → Web Resources → mdecat_wogenerator/index.html         ║
║  → Preview                                               ║
╚══════════════════════════════════════════════════════════╝
`);

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { randomUUID } from 'crypto';

import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..').replace(/\//g, '/');
const DIST = join(ROOT, 'dist');
const REF = join(ROOT, '.sol_fromref');
const PAC = 'C:\\Users\\madecat\\AppData\\Local\\Microsoft\\PowerAppsCli\\Microsoft.PowerApps.CLI.2.4.1\\tools\\pac.exe';

const PUBLISHER_PREFIX = 'mdecat';
const WR_FOLDER = 'wogenerator';
const SOLUTION_NAME = 'gbbwogeneratorclaude';
const SOLUTION_DISPLAY = 'GBB WO Generator Claude';
const SOL_VERSION = '1.0.0.0';
const WR_TYPES = { '.html': 1, '.css': 2, '.js': 3, '.xml': 4, '.png': 5, '.jpg': 6, '.gif': 7, '.ico': 10 };

function collectFiles(dir) {
  const r = [];
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) r.push(...collectFiles(f));
    else r.push(f);
  }
  return r;
}

function makeWrFileName(logicalName, guidUpper) {
  return logicalName.replace(/\//g, '').replace(/\./g, '') + guidUpper;
}

const webResources = collectFiles(DIST)
  .filter(f => extname(f).toLowerCase() !== '.svg')
  .map(filePath => {
    const rel = relative(DIST, filePath).replace(/\\/g, '/');
    const logicalName = `${PUBLISHER_PREFIX}_${WR_FOLDER}/${rel}`;
    const ext = extname(filePath).toLowerCase();
    const wrType = WR_TYPES[ext] ?? 3;
    const displayName = rel.split('/').pop() ?? rel;
    const guidLower = randomUUID();
    const guidUpper = guidLower.toUpperCase();
    const wrFileName = makeWrFileName(logicalName, guidUpper);
    return { filePath, rel, logicalName, ext, wrType, displayName, guidLower, guidUpper, wrFileName };
  });

console.log(`${webResources.length} web resources`);

// Use reference XML opening tags (from a known-working exported solution)
const refSolXml = readFileSync(join(REF, 'solution.xml'), 'utf8');
const refCustXml = readFileSync(join(REF, 'customizations.xml'), 'utf8');
const solOpen = refSolXml.match(/^<ImportExportXml[^>]*>/)[0];
const custOpen = refCustXml.match(/^<ImportExportXml[^>]*>/)[0];

console.log('solOpen:', solOpen.substring(0, 80));
console.log('custOpen:', custOpen.substring(0, 80));

const rootComponents = webResources
  .map(wr => `      <RootComponent type="61" schemaName="${wr.logicalName}" behavior="0" />`)
  .join('\n');

const wrEntries = webResources.map(wr => [
  `    <WebResource>`,
  `      <WebResourceId>{${wr.guidLower}}</WebResourceId>`,
  `      <Name>${wr.logicalName}</Name>`,
  `      <DisplayName>${wr.displayName}</DisplayName>`,
  `      <LanguageCode>1033</LanguageCode>`,
  `      <WebResourceType>${wr.wrType}</WebResourceType>`,
  `      <IntroducedVersion>${SOL_VERSION}</IntroducedVersion>`,
  `      <IsEnabledForMobileClient>0</IsEnabledForMobileClient>`,
  `      <IsAvailableForMobileOffline>0</IsAvailableForMobileOffline>`,
  `      <IsCustomizable>1</IsCustomizable>`,
  `      <CanBeDeleted>1</CanBeDeleted>`,
  `      <IsHidden>0</IsHidden>`,
  `      <FileName>/WebResources/${wr.wrFileName}</FileName>`,
  `    </WebResource>`,
].join('\n')).join('\n');

const newSolXml = [
  solOpen,
  '  <SolutionManifest>',
  `    <UniqueName>${SOLUTION_NAME}</UniqueName>`,
  `    <LocalizedNames><LocalizedName description="${SOLUTION_DISPLAY}" languagecode="1033" /></LocalizedNames>`,
  `    <Descriptions><Description description="Enterprise WO Generator" languagecode="1033" /></Descriptions>`,
  `    <Version>${SOL_VERSION}</Version>`,
  '    <Managed>0</Managed>',
  '    <Publisher>',
  '      <UniqueName>mdecat</UniqueName>',
  '      <LocalizedNames><LocalizedName description="mdecat" languagecode="1033" /></LocalizedNames>',
  '      <Descriptions><Description description="mdecat publisher" languagecode="1033" /></Descriptions>',
  '      <EMailAddress></EMailAddress>',
  '      <SupportingWebsiteUrl></SupportingWebsiteUrl>',
  '      <CustomizationPrefix>mdecat</CustomizationPrefix>',
  '      <CustomizationOptionValuePrefix>10000</CustomizationOptionValuePrefix>',
  '      <Addresses><Address>',
  '          <AddressNumber>1</AddressNumber><AddressTypeCode>1</AddressTypeCode>',
  '          <City xsi:nil="true"></City><County xsi:nil="true"></County><Country xsi:nil="true"></Country>',
  '          <Fax xsi:nil="true"></Fax><FreightTermsCode xsi:nil="true"></FreightTermsCode>',
  '          <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>',
  '          <Latitude xsi:nil="true"></Latitude><Line1 xsi:nil="true"></Line1><Line2 xsi:nil="true"></Line2>',
  '          <Line3 xsi:nil="true"></Line3><Longitude xsi:nil="true"></Longitude><Name xsi:nil="true"></Name>',
  '          <PostalCode xsi:nil="true"></PostalCode><PostOfficeBox xsi:nil="true"></PostOfficeBox>',
  '          <PrimaryContactName xsi:nil="true"></PrimaryContactName>',
  '          <ShippingMethodCode xsi:nil="true"></ShippingMethodCode>',
  '          <StateOrProvince xsi:nil="true"></StateOrProvince>',
  '          <Telephone1 xsi:nil="true"></Telephone1><Telephone2 xsi:nil="true"></Telephone2>',
  '          <Telephone3 xsi:nil="true"></Telephone3>',
  '          <TimeZoneRuleVersionNumber xsi:nil="true"></TimeZoneRuleVersionNumber>',
  '          <UPSZone xsi:nil="true"></UPSZone><UTCOffset xsi:nil="true"></UTCOffset>',
  '          <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>',
  '        </Address></Addresses>',
  '    </Publisher>',
  '    <RootComponents>',
  rootComponents,
  '    </RootComponents>',
  '    <MissingDependencies />',
  '  </SolutionManifest>',
  '</ImportExportXml>',
].join('\n');

const newCustXml = [
  custOpen,
  '  <Entities></Entities>',
  '  <Roles></Roles>',
  '  <Workflows></Workflows>',
  '  <FieldSecurityProfiles></FieldSecurityProfiles>',
  '  <Templates />',
  '  <EntityMaps />',
  '  <EntityRelationships />',
  '  <OrganizationSettings />',
  '  <optionsets />',
  '  <WebResources>',
  wrEntries,
  '  </WebResources>',
  '  <CustomControls />',
  '  <EntityDataProviders />',
  '  <Languages>',
  '    <Language>1033</Language>',
  '  </Languages>',
  '</ImportExportXml>',
].join('\n');

const SOL_TEMP = join(ROOT, '.sol_build2');
rmSync(SOL_TEMP, { recursive: true, force: true });
mkdirSync(join(SOL_TEMP, 'WebResources'), { recursive: true });

// Generate [Content_Types].xml matching exact Dataverse export format
const overrides = webResources.map(wr =>
  `<Override PartName="/WebResources/${wr.wrFileName}" ContentType="application/octet-stream" />`
).join('');
const ctXml = `\uFEFF<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/octet-stream" />${overrides}</Types>`;

writeFileSync(join(SOL_TEMP, 'solution.xml'), newSolXml, 'utf8');
writeFileSync(join(SOL_TEMP, 'customizations.xml'), newCustXml, 'utf8');
writeFileSync(join(SOL_TEMP, '[Content_Types].xml'), ctXml, 'utf8');

for (const wr of webResources) {
  writeFileSync(join(SOL_TEMP, 'WebResources', wr.wrFileName), readFileSync(wr.filePath));
}

// Use Python to create ZIP with forward-slash entry names (required by Dataverse)
const ZIP = join(ROOT, 'gbbwogeneratorclaude_v2_deploy.zip');
try { rmSync(ZIP, { force: true }); } catch {}

const pyEntries = [
  ['solution.xml', join(SOL_TEMP, 'solution.xml')],
  ['customizations.xml', join(SOL_TEMP, 'customizations.xml')],
  ...webResources.map(wr => [`WebResources/${wr.wrFileName}`, join(SOL_TEMP, 'WebResources', wr.wrFileName)]),
  ['[Content_Types].xml', join(SOL_TEMP, '[Content_Types].xml')],
];

let pyScript = `import zipfile\nwith zipfile.ZipFile(r'${ZIP.replace(/\\/g, '\\\\')}', 'w', zipfile.ZIP_DEFLATED) as z:\n`;
for (const [entry, fp] of pyEntries) {
  pyScript += `  z.write(r'${fp.replace(/\\/g, '\\\\')}', '${entry}')\n`;
}
const PY_PATH = join(ROOT, '.makzip.py');
writeFileSync(PY_PATH, pyScript, 'utf8');
execSync(`python "${PY_PATH}"`, { stdio: 'inherit' });
console.log('ZIP created:', ZIP);

const r = spawnSync(PAC, ['solution', 'import', '--path', ZIP, '--force-overwrite', '--async'], { encoding: 'utf8', stdio: 'pipe' });
console.log(r.stdout || '(no stdout)');
if (r.stderr) console.error(r.stderr);
console.log('Exit:', r.status);

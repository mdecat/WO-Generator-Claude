import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMP = join(ROOT, '.sol_minimal');
const PAC = 'C:\\Users\\madecat\\AppData\\Local\\Microsoft\\PowerAppsCli\\Microsoft.PowerApps.CLI.2.4.1\\tools\\pac.exe';

const GUID_LOWER = randomUUID();
const GUID_UPPER = GUID_LOWER.toUpperCase();
const LOGICAL_NAME = 'mdecat_wogenerator/index.html';
const WR_FILENAME = 'mdecat_wogeneratorindexhtml' + GUID_UPPER;
const ORG = '9.2.26024.146';

rmSync(TEMP, { recursive: true, force: true });
mkdirSync(join(TEMP, 'WebResources'), { recursive: true });

const solXml = `<ImportExportXml version="${ORG}" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" OrganizationVersion="${ORG}" OrganizationSchemaType="Full" CRMServerServiceabilityVersion="9.2.26032.00144">
  <SolutionManifest>
    <UniqueName>gbbwogeneratorclaude</UniqueName>
    <LocalizedNames><LocalizedName description="GBB WO Generator Claude" languagecode="1033" /></LocalizedNames>
    <Descriptions><Description description="Test" languagecode="1033" /></Descriptions>
    <Version>1.0.0.0</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>mdecat</UniqueName>
      <LocalizedNames><LocalizedName description="mdecat" languagecode="1033" /></LocalizedNames>
      <Descriptions><Description description="mdecat publisher" languagecode="1033" /></Descriptions>
      <EMailAddress></EMailAddress><SupportingWebsiteUrl></SupportingWebsiteUrl>
      <CustomizationPrefix>mdecat</CustomizationPrefix>
      <CustomizationOptionValuePrefix>10000</CustomizationOptionValuePrefix>
      <Addresses><Address>
        <AddressNumber>1</AddressNumber><AddressTypeCode>1</AddressTypeCode>
        <City xsi:nil="true"></City><County xsi:nil="true"></County><Country xsi:nil="true"></Country>
        <Fax xsi:nil="true"></Fax><FreightTermsCode xsi:nil="true"></FreightTermsCode>
        <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>
        <Latitude xsi:nil="true"></Latitude><Line1 xsi:nil="true"></Line1><Line2 xsi:nil="true"></Line2>
        <Line3 xsi:nil="true"></Line3><Longitude xsi:nil="true"></Longitude><Name xsi:nil="true"></Name>
        <PostalCode xsi:nil="true"></PostalCode><PostOfficeBox xsi:nil="true"></PostOfficeBox>
        <PrimaryContactName xsi:nil="true"></PrimaryContactName>
        <ShippingMethodCode xsi:nil="true"></ShippingMethodCode>
        <StateOrProvince xsi:nil="true"></StateOrProvince>
        <Telephone1 xsi:nil="true"></Telephone1><Telephone2 xsi:nil="true"></Telephone2>
        <Telephone3 xsi:nil="true"></Telephone3>
        <TimeZoneRuleVersionNumber xsi:nil="true"></TimeZoneRuleVersionNumber>
        <UPSZone xsi:nil="true"></UPSZone><UTCOffset xsi:nil="true"></UTCOffset>
        <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>
      </Address></Addresses>
    </Publisher>
    <RootComponents>
      <RootComponent type="61" schemaName="${LOGICAL_NAME}" behavior="0" />
    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>`;

const custXml = `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" OrganizationVersion="${ORG}" OrganizationSchemaType="Full" CRMServerServiceabilityVersion="9.2.26032.00144">
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
    <WebResource>
      <WebResourceId>{${GUID_LOWER}}</WebResourceId>
      <Name>${LOGICAL_NAME}</Name>
      <DisplayName>index.html</DisplayName>
      <LanguageCode>1033</LanguageCode>
      <WebResourceType>1</WebResourceType>
      <IntroducedVersion>1.0.0.0</IntroducedVersion>
      <IsEnabledForMobileClient>0</IsEnabledForMobileClient>
      <IsAvailableForMobileOffline>0</IsAvailableForMobileOffline>
      <IsCustomizable>1</IsCustomizable>
      <CanBeDeleted>1</CanBeDeleted>
      <IsHidden>0</IsHidden>
      <FileName>/WebResources/${WR_FILENAME}</FileName>
    </WebResource>
  </WebResources>
  <CustomControls />
  <EntityDataProviders />
  <Languages>
    <Language>1033</Language>
  </Languages>
</ImportExportXml>`;

// Match exact format from Dataverse solution export (BOM + namespace + Override per file)
const ctXml = `\uFEFF<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/octet-stream" /><Override PartName="/WebResources/${WR_FILENAME}" ContentType="application/octet-stream" /></Types>`;

writeFileSync(join(TEMP, 'solution.xml'), solXml, 'utf8');
writeFileSync(join(TEMP, 'customizations.xml'), custXml, 'utf8');
writeFileSync(join(TEMP, '[Content_Types].xml'), ctXml, 'utf8');
writeFileSync(join(TEMP, 'WebResources', WR_FILENAME), '<html><body>Hello WO Generator</body></html>', 'utf8');

const ZIP_PATH = join(ROOT, 'minimal_test.zip');
try { rmSync(ZIP_PATH, { force: true }); } catch {}

// Use Python to create ZIP with forward-slash entry names (required by Dataverse)
const PY_SCRIPT = join(ROOT, '.makzip.py');
const entries = [
  ['solution.xml', join(TEMP, 'solution.xml')],
  ['customizations.xml', join(TEMP, 'customizations.xml')],
  ['[Content_Types].xml', join(TEMP, '[Content_Types].xml')],
  [`WebResources/${WR_FILENAME}`, join(TEMP, 'WebResources', WR_FILENAME)],
];

let py = `import zipfile\nwith zipfile.ZipFile(r'${ZIP_PATH.replace(/\\/g, '\\\\')}', 'w', zipfile.ZIP_DEFLATED) as z:\n`;
for (const [entryName, filePath] of entries) {
  py += `  z.write(r'${filePath.replace(/\\/g, '\\\\')}', '${entryName}')\n`;
}
writeFileSync(PY_SCRIPT, py, 'utf8');
execSync(`python "${PY_SCRIPT}"`, { stdio: 'inherit' });
console.log('ZIP created');

const r = spawnSync(PAC, ['solution', 'import', '--path', ZIP_PATH, '--force-overwrite', '--async'], { encoding: 'utf8', stdio: 'pipe' });
console.log(r.stdout || '(no stdout)');
if (r.stderr) console.error(r.stderr);
console.log('Exit:', r.status);

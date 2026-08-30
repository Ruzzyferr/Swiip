import { apple } from './apple-api.mjs';

const UYG = '6803979374';

const surumler = await apple(
  `/apps/${UYG}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate,releaseType`,
);
console.log('=== SURUMLER ===');
for (const s of surumler.data) {
  console.log(' ', s.id, s.attributes.versionString, s.attributes.appStoreState,
    '| releaseType:', s.attributes.releaseType, '|', s.attributes.createdDate);
}

const builds = await apple(
  `/builds?filter[app]=${UYG}&limit=6&sort=-version&fields[builds]=version,processingState,uploadedDate,expired`,
);
console.log('=== BUILDLER ===');
for (const b of builds.data) {
  console.log(' ', b.id, 'build', b.attributes.version, b.attributes.processingState,
    'expired:', b.attributes.expired, '|', b.attributes.uploadedDate);
}

const gonderimler = await apple(
  `/reviewSubmissions?filter[app]=${UYG}&limit=5&fields[reviewSubmissions]=state,submitted,platform,submittedDate`,
);
console.log('=== INCELEME GONDERIMLERI ===');
for (const g of gonderimler.data) {
  console.log(' ', g.id, g.attributes.state, 'submitted:', g.attributes.submitted,
    '|', g.attributes.submittedDate);
}

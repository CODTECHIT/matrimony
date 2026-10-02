import jwt from 'jsonwebtoken';
import { pool } from '../backend/dist/config/db.js';

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'yfj_matrimony_secret_jwt_key_2026_dev';

const DEMO_ID = '64e47f1a-f4b5-46d0-8e4d-3461627510f8';
const ASHOK_ID = '4acf0781-6fcf-4877-94f8-936535dea66d';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const demoToken = createToken({
  id: DEMO_ID,
  role: 'user',
  plan: 'free',
  gender: 'male',
});

const ashokToken = createToken({
  id: ASHOK_ID,
  role: 'user',
  plan: 'free',
  gender: 'male',
});

const results = [];

function recordResult(testName, passed, details, error = null) {
  results.push({ testName, passed, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`);
  if (details) console.log(`   Details: ${JSON.stringify(details)}`);
  if (error) console.error(`   Error: ${error}`);
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('Milestone 1 Challenger 2: Adversarial Stress Test Suite');
  console.log('================================================================\n');

  // --- Step 0: Backup baseline state of demo ---
  console.log('Step 0: Capturing demo baseline state...');
  const userBackupRes = await pool.query('SELECT * FROM users WHERE id = $1', [DEMO_ID]);
  const profileBackupRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [DEMO_ID]);
  const baselineUser = userBackupRes.rows[0];
  const baselineProfile = profileBackupRes.rows[0];
  console.log(`Demo baseline: mobile=${baselineUser.mobile}, display_id=${baselineUser.display_id}, name=${baselineUser.full_name}\n`);

  try {
    // =========================================================================
    // TC1: Baseline API check
    // =========================================================================
    console.log('--- TC1: Baseline GET /api/profiles/me ---');
    const meRes = await api('/api/profiles/me', { token: demoToken });
    const tc1Passed = meRes.status === 200 && meRes.data?.id === DEMO_ID;
    recordResult('TC1: GET /api/profiles/me baseline', tc1Passed, {
      status: meRes.status,
      displayId: meRes.data?.displayId,
      fullName: meRes.data?.fullName,
    });

    // =========================================================================
    // TC2: Empty Payload Handling
    // =========================================================================
    console.log('\n--- TC2: Empty payload {} on PATCH /api/profiles/me ---');
    const emptyPatchRes = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: {},
    });
    const tc2Passed = emptyPatchRes.status === 200 && emptyPatchRes.data?.id === DEMO_ID;
    recordResult('TC2: Empty payload PATCH /me', tc2Passed, {
      status: emptyPatchRes.status,
      preservedFullName: emptyPatchRes.data?.fullName,
      preservedCity: emptyPatchRes.data?.city,
    });

    // =========================================================================
    // TC3: Extreme Text Length (5,000 characters in about)
    // =========================================================================
    console.log('\n--- TC3: Extreme Text Length (5,000 characters in about) ---');
    const extremeBio = 'A'.repeat(5000);
    const extremeRes = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { about: extremeBio },
    });
    const dbAboutRes = await pool.query('SELECT about FROM profiles WHERE id = $1', [DEMO_ID]);
    const tc3Passed =
      extremeRes.status === 200 &&
      extremeRes.data?.about?.length === 5000 &&
      dbAboutRes.rows[0]?.about?.length === 5000;
    recordResult('TC3: 5000-character about bio', tc3Passed, {
      status: extremeRes.status,
      returnedLen: extremeRes.data?.about?.length,
      dbLen: dbAboutRes.rows[0]?.about?.length,
    });

    // =========================================================================
    // TC4: All 22 Canonical Profile Fields with Unicode, Emojis, Accents, HTML
    // =========================================================================
    console.log('\n--- TC4: All 22 Fields with Unicode, Emojis, Accents & HTML ---');
    const complexPayload = {
      fullName: 'Priya Sharma 💖 <script>alert("XSS")</script>',
      gender: 'female',
      dateOfBirth: '1997-08-20',
      maritalStatus: 'Never married',
      height: `5'6"`,
      religion: 'Hindu 🕉️',
      caste: 'Brahmin / गौड़',
      motherTongue: 'Hindi / हिन्दी',
      education: 'Master of Technology 🎓 <b style="color:red">Honors</b>',
      occupation: 'Senior Data Scientist 📊 & ML Engineer',
      employmentStatus: 'Private sector',
      incomeRange: '₹25 LPA+',
      city: 'Bengaluru 🏙️',
      state: 'Karnataka',
      country: 'India 🇮🇳',
      fatherOccupation: 'Retired Professor & Author ✍️',
      motherOccupation: 'Classical Musician 🎵',
      siblings: '1 Brother (Married) & 1 Sister',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
      about: 'Passionate violinist 🎻 & engineer. René & Joséphine <script>alert(1)</script>',
      whatsapp: '+919876543210',
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      ],
    };

    const tc4Res = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: complexPayload,
    });

    // Check immediate reload persistence via GET /me
    const tc4GetRes = await api('/api/profiles/me', { token: demoToken });
    const g = tc4GetRes.data;

    const tc4Matches =
      tc4Res.status === 200 &&
      tc4GetRes.status === 200 &&
      g.fullName === complexPayload.fullName &&
      g.gender === complexPayload.gender &&
      g.dateOfBirth === complexPayload.dateOfBirth &&
      g.maritalStatus === 'never_married' &&
      g.height === complexPayload.height &&
      g.religion === complexPayload.religion &&
      g.caste === complexPayload.caste &&
      g.motherTongue === complexPayload.motherTongue &&
      g.education === complexPayload.education &&
      g.occupation === complexPayload.occupation &&
      g.employmentStatus === complexPayload.employmentStatus &&
      g.incomeRange === complexPayload.incomeRange &&
      g.city === complexPayload.city &&
      g.state === complexPayload.state &&
      g.country === complexPayload.country &&
      g.family?.fatherOccupation === complexPayload.fatherOccupation &&
      g.family?.motherOccupation === complexPayload.motherOccupation &&
      g.family?.siblings === complexPayload.siblings &&
      g.family?.familyType === complexPayload.familyType &&
      g.family?.familyValues === complexPayload.familyValues &&
      g.about === complexPayload.about &&
      g.contact?.whatsapp === complexPayload.whatsapp &&
      Array.isArray(g.photos) &&
      g.photos.length === 2 &&
      g.photos[0] === complexPayload.photos[0];

    recordResult('TC4: All 22 canonical fields populated & persisted', tc4Matches, {
      status: tc4Res.status,
      getStatus: tc4GetRes.status,
      casteMatches: g.caste === complexPayload.caste,
      religionMatches: g.religion === complexPayload.religion,
      contactWhatsappMatches: g.contact?.whatsapp === complexPayload.whatsapp,
      aboutMatches: g.about === complexPayload.about,
    });

    // =========================================================================
    // TC5: WhatsApp Handling — Formats and Validation
    // =========================================================================
    console.log('\n--- TC5: WhatsApp Number Handling ---');

    // 5a: Standard E.164
    const wa1 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { whatsapp: '+919876543210' },
    });
    const wa1Check = wa1.status === 200 && wa1.data?.contact?.whatsapp === '+919876543210';
    recordResult('TC5a: WhatsApp E.164 format (+919876543210)', wa1Check, {
      status: wa1.status,
      whatsapp: wa1.data?.contact?.whatsapp,
    });

    // 5b: 10-digit format
    const wa2 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { whatsapp: '9876543210' },
    });
    const wa2Check = wa2.status === 200 && wa2.data?.contact?.whatsapp === '9876543210';
    recordResult('TC5b: WhatsApp 10-digit format (9876543210)', wa2Check, {
      status: wa2.status,
      whatsapp: wa2.data?.contact?.whatsapp,
    });

    // 5c: Formatted US format
    const wa3 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { whatsapp: '+1 (555) 123-4567' },
    });
    const wa3Check = wa3.status === 200 && wa3.data?.contact?.whatsapp === '+1 (555) 123-4567';
    recordResult('TC5c: WhatsApp formatted US (+1 (555) 123-4567)', wa3Check, {
      status: wa3.status,
      whatsapp: wa3.data?.contact?.whatsapp,
    });

    // 5d: Non-numeric string within 20 chars
    const wa4 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { whatsapp: 'invalid_phone' },
    });
    const wa4Check = wa4.status === 200 && wa4.data?.contact?.whatsapp === 'invalid_phone';
    recordResult('TC5d: WhatsApp non-numeric text string', wa4Check, {
      status: wa4.status,
      whatsapp: wa4.data?.contact?.whatsapp,
    });

    // 5e: WhatsApp format exceeding 20 chars
    console.log('Testing WhatsApp > 20 chars...');
    const wa5 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { whatsapp: '+9198765432109876543210' }, // 23 chars
    });
    console.log(`WhatsApp > 20 chars response status: ${wa5.status}, message: ${wa5.data?.message}`);
    // Note: If postgres column is varchar(20), it will throw value too long error (status 500)
    recordResult('TC5e: WhatsApp length > 20 chars handling', wa5.status === 500 || wa5.status === 400, {
      status: wa5.status,
      message: wa5.data?.message,
      note: 'Postgres enforces varchar(20) constraint',
    });

    // =========================================================================
    // TC6: Null vs Empty String Handling Across Sections
    // =========================================================================
    console.log('\n--- TC6: Null vs Empty String Handling ---');

    // 6a: Null handling
    const nullPayload = {
      about: null,
      height: null,
      religion: null,
      caste: null,
      motherTongue: null,
      education: null,
      occupation: null,
      employmentStatus: null,
      incomeRange: null,
      city: null,
      state: null,
      country: null,
      fatherOccupation: null,
      motherOccupation: null,
      siblings: null,
      familyType: null,
      familyValues: null,
      whatsapp: null,
      dateOfBirth: null,
    };
    const nullRes = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: nullPayload,
    });
    const tc6aPassed = nullRes.status === 200;
    recordResult('TC6a: Explicit null fields in payload', tc6aPassed, {
      status: nullRes.status,
      about: nullRes.data?.about,
      caste: nullRes.data?.caste,
    });

    // 6b: Empty string handling
    const emptyStrPayload = {
      about: '',
      height: '',
      religion: '',
      caste: '',
      motherTongue: '',
      education: '',
      occupation: '',
      employmentStatus: '',
      incomeRange: '',
      city: '',
      state: '',
      country: '',
      fatherOccupation: '',
      motherOccupation: '',
      siblings: '',
      familyType: '',
      familyValues: '',
      whatsapp: '',
      dateOfBirth: '',
    };
    const emptyStrRes = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: emptyStrPayload,
    });
    const tc6bPassed = emptyStrRes.status === 200;
    recordResult('TC6b: Empty string fields in payload', tc6bPassed, {
      status: emptyStrRes.status,
      about: emptyStrRes.data?.about,
      caste: emptyStrRes.data?.caste,
      dateOfBirth: emptyStrRes.data?.dateOfBirth,
    });

    // =========================================================================
    // TC7: Photos Array and Avatar Synchronization
    // =========================================================================
    console.log('\n--- TC7: Photos Array and Avatar Synchronization ---');

    // 7a: Set 2 photos, check avatar_url = photos[0]
    const photoList = [
      'https://example.com/photo_primary.jpg',
      'https://example.com/photo_secondary.jpg',
    ];
    const photoRes1 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { photos: photoList },
    });
    const dbUserPhoto1 = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [DEMO_ID]);
    const tc7aPassed =
      photoRes1.status === 200 &&
      photoRes1.data?.photos?.[0] === photoList[0] &&
      dbUserPhoto1.rows[0]?.avatar_url === photoList[0];

    recordResult('TC7a: Primary avatar matches photos[0]', tc7aPassed, {
      status: photoRes1.status,
      apiAvatar: photoRes1.data?.photos?.[0],
      dbAvatar: dbUserPhoto1.rows[0]?.avatar_url,
    });

    // 7b: Reorder photos
    const reorderedList = [photoList[1], photoList[0]];
    const photoRes2 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { photos: reorderedList },
    });
    const dbUserPhoto2 = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [DEMO_ID]);
    const tc7bPassed =
      photoRes2.status === 200 &&
      photoRes2.data?.photos?.[0] === reorderedList[0] &&
      dbUserPhoto2.rows[0]?.avatar_url === reorderedList[0];

    recordResult('TC7b: Reordered photos updates primary avatar', tc7bPassed, {
      status: photoRes2.status,
      apiAvatar: photoRes2.data?.photos?.[0],
      dbAvatar: dbUserPhoto2.rows[0]?.avatar_url,
    });

    // 7c: Empty photos array clears avatar_url
    const photoRes3 = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { photos: [] },
    });
    const dbUserPhoto3 = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [DEMO_ID]);
    const tc7cPassed =
      photoRes3.status === 200 &&
      dbUserPhoto3.rows[0]?.avatar_url === null;

    recordResult('TC7c: Empty photos array clears users.avatar_url', tc7cPassed, {
      status: photoRes3.status,
      dbAvatar: dbUserPhoto3.rows[0]?.avatar_url,
    });

    // =========================================================================
    // TC8: Duplicate Mobile Number Conflict
    // =========================================================================
    console.log('\n--- TC8: Duplicate Mobile Conflict Handling ---');
    // Ashok has mobile: "6325669856"
    // Demo attempts to update their mobile to Ashok's mobile
    const dupRes = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: { mobile: baselineUser.mobile ? '6325669856' : '6325669856' },
    });

    const isClean400 = dupRes.status === 400;
    const isCleanMessage =
      dupRes.data?.message?.includes('already in use') || dupRes.data?.message?.includes('mobile');
    
    // Verify demo's mobile in DB remains unchanged
    const demoDbUser = await pool.query('SELECT mobile FROM users WHERE id = $1', [DEMO_ID]);
    const ashokDbUser = await pool.query('SELECT mobile FROM users WHERE id = $1', [ASHOK_ID]);

    const tc8Passed =
      isClean400 &&
      isCleanMessage &&
      demoDbUser.rows[0]?.mobile !== '6325669856' &&
      ashokDbUser.rows[0]?.mobile === '6325669856';

    recordResult('TC8: Duplicate mobile returns clean HTTP 400 without corruption', tc8Passed, {
      status: dupRes.status,
      message: dupRes.data?.message,
      demoMobileInDb: demoDbUser.rows[0]?.mobile,
      ashokMobileInDb: ashokDbUser.rows[0]?.mobile,
    });

    // =========================================================================
    // TC9: Dual-Identifier Routing Resolution
    // =========================================================================
    console.log('\n--- TC9: Dual-Identifier Routing (UUID vs Display ID) ---');
    const [p1UuidRes, p1DisplayRes] = await Promise.all([
      api(`/api/profiles/${DEMO_ID}`),
      api('/api/profiles/P1'),
    ]);

    const [p2UuidRes, p2DisplayRes] = await Promise.all([
      api(`/api/profiles/${ASHOK_ID}`),
      api('/api/profiles/P2'),
    ]);

    const tc9aPassed =
      p1UuidRes.status === 200 &&
      p1DisplayRes.status === 200 &&
      p1UuidRes.data?.id === p1DisplayRes.data?.id &&
      p1UuidRes.data?.fullName === p1DisplayRes.data?.fullName;

    const tc9bPassed =
      p2UuidRes.status === 200 &&
      p2DisplayRes.status === 200 &&
      p2UuidRes.data?.id === p2DisplayRes.data?.id &&
      p2UuidRes.data?.fullName === p2DisplayRes.data?.fullName;

    recordResult('TC9: Dual-identifier resolution (P1/UUID & P2/UUID)', tc9aPassed && tc9bPassed, {
      p1Match: tc9aPassed,
      p2Match: tc9bPassed,
    });

    // =========================================================================
    // TC10: Database Reload Persistence (Direct SQL Comparison)
    // =========================================================================
    console.log('\n--- TC10: Database Reload Persistence (Direct SQL Verification) ---');
    // Save a known full profile
    const testPersistencePayload = {
      fullName: 'Demo Test Persistence',
      gender: 'male',
      dateOfBirth: '1995-04-12',
      maritalStatus: 'never_married',
      height: `5'10"`,
      religion: 'Hindu',
      caste: 'Kshatriya',
      motherTongue: 'Marathi',
      education: 'B.Tech Computer Science',
      occupation: 'Lead Architect',
      employmentStatus: 'Private sector',
      incomeRange: '₹25 LPA+',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      fatherOccupation: 'Civil Engineer',
      motherOccupation: 'Professor',
      siblings: 'None',
      familyType: 'Nuclear',
      familyValues: 'Moderate',
      about: 'Authentic reload persistence test bio.',
      whatsapp: '+919988776655',
      photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600'],
    };

    const persistPatch = await api('/api/profiles/me', {
      method: 'PATCH',
      token: demoToken,
      body: testPersistencePayload,
    });

    // Fetch via API
    const persistApiGet = await api('/api/profiles/me', { token: demoToken });

    // Fetch directly from DB via fresh SQL query
    const dbReload = await pool.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.display_id
       FROM profiles pr JOIN users u ON pr.id = u.id WHERE pr.id = $1`,
      [DEMO_ID],
    );
    const dbRow = dbReload.rows[0];

    const sqlMatches =
      dbRow.full_name === testPersistencePayload.fullName &&
      dbRow.gender === testPersistencePayload.gender &&
      dbRow.religion === testPersistencePayload.religion &&
      dbRow.caste === testPersistencePayload.caste &&
      dbRow.mother_tongue === testPersistencePayload.motherTongue &&
      dbRow.education === testPersistencePayload.education &&
      dbRow.occupation === testPersistencePayload.occupation &&
      dbRow.city === testPersistencePayload.city &&
      dbRow.state === testPersistencePayload.state &&
      dbRow.country === testPersistencePayload.country &&
      dbRow.father_occupation === testPersistencePayload.fatherOccupation &&
      dbRow.mother_occupation === testPersistencePayload.motherOccupation &&
      dbRow.family_type === testPersistencePayload.familyType &&
      dbRow.about === testPersistencePayload.about &&
      dbRow.whatsapp === testPersistencePayload.whatsapp &&
      dbRow.avatar_url === testPersistencePayload.photos[0];

    const apiMatches =
      persistApiGet.data?.fullName === testPersistencePayload.fullName &&
      persistApiGet.data?.city === testPersistencePayload.city &&
      persistApiGet.data?.contact?.whatsapp === testPersistencePayload.whatsapp;

    const tc10Passed = persistPatch.status === 200 && sqlMatches && apiMatches;
    recordResult('TC10: Field-by-field database reload persistence', tc10Passed, {
      patchStatus: persistPatch.status,
      sqlMatches,
      apiMatches,
      dbCity: dbRow.city,
      dbWhatsapp: dbRow.whatsapp,
      dbAvatar: dbRow.avatar_url,
    });

  } finally {
    // --- Step Cleanup: Restore demo to its baseline state ---
    console.log('\n--- Cleanup: Restoring Demo Baseline State ---');
    try {
      await pool.query(
        `UPDATE users SET full_name = $1, mobile = $2, avatar_url = $3 WHERE id = $4`,
        [baselineUser.full_name, baselineUser.mobile, baselineUser.avatar_url, DEMO_ID],
      );
      await pool.query(
        `UPDATE profiles SET
          about = $1, height = $2, religion = $3, caste = $4, mother_tongue = $5,
          marital_status = $6, date_of_birth = $7, education = $8, occupation = $9,
          employment_status = $10, income_range = $11, city = $12, state = $13, country = $14,
          father_occupation = $15, mother_occupation = $16, siblings = $17, family_type = $18,
          family_values = $19, whatsapp = $20, photos = $21
        WHERE id = $22`,
        [
          baselineProfile.about,
          baselineProfile.height,
          baselineProfile.religion,
          baselineProfile.caste,
          baselineProfile.mother_tongue,
          baselineProfile.marital_status,
          baselineProfile.date_of_birth,
          baselineProfile.education,
          baselineProfile.occupation,
          baselineProfile.employment_status,
          baselineProfile.income_range,
          baselineProfile.city,
          baselineProfile.state,
          baselineProfile.country,
          baselineProfile.father_occupation,
          baselineProfile.mother_occupation,
          baselineProfile.siblings,
          baselineProfile.family_type,
          baselineProfile.family_values,
          baselineProfile.whatsapp,
          baselineProfile.photos,
          DEMO_ID,
        ],
      );
      console.log('✅ Demo baseline state successfully restored.');
    } catch (cleanupErr) {
      console.error('❌ Failed to restore demo baseline state:', cleanupErr);
    }
  }

  // --- Summary ---
  console.log('\n================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================');
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Verdict: ${failCount === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);

  await pool.end();
  return { passCount, failCount, results };
}

runAllTests().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});

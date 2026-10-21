/**
 * LifeLink Patient SOS Simulation Script
 * Triggers an SOS emergency request on the active FastAPI backend
 * and watches for the hospital dashboard to accept it in real time.
 */

import fs from 'node:fs';
import path from 'node:path';

// Read API URL from .env if present
let apiUrl = 'https://gone-backend.onrender.com';
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
  const match = envContent.match(/VITE_API_BASE_URL=(.+)/);
  if (match && match[1]) {
    apiUrl = match[1].trim();
  }
} catch {}

console.log('--------------------------------------------------');
console.log(' LifeLink Patient SOS Live Simulation');
console.log(' Target Backend:', apiUrl);
console.log('--------------------------------------------------');

async function main() {
  const ts = Date.now().toString().slice(-6);
  const patientEmail = `citizen_${ts}@gmail.com`;
  const patientPassword = 'TestPassword123!';
  const patientName = 'Aarav Patel';
  const patientPhone = '+91 98201 ' + ts;
  const description = 'Cardiac emergency · Severe chest pain and shortness of breath';

  console.log(`[1/4] Registering/Authenticating simulated citizen (${patientEmail})...`);
  try {
    await fetch(`${apiUrl}/users/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: patientName,
        email: patientEmail,
        phone_number: '98201' + ts,
        password: patientPassword,
        profile_photo: 'https://avatar.iran.liara.run/public',
      }),
    });
  } catch (err) {
    console.error('Failed to reach backend:', err.message);
    process.exit(1);
  }

  const loginRes = await fetch(`${apiUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: patientEmail,
      password: patientPassword,
    }),
  });

  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    console.error('Login failed:', errorText);
    process.exit(1);
  }

  const { access_token } = await loginRes.json();
  console.log('[2/4] Citizen authenticated. Bearer token acquired.');

  console.log('[3/4] Dispatching SOS Emergency alert to backend...');
  const sosRes = await fetch(`${apiUrl}/sos/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      patient_name: patientName,
      patient_phone: patientPhone,
      description,
      latitude: 19.697,
      longitude: 72.766,
    }),
  });

  if (!sosRes.ok) {
    const errorText = await sosRes.text();
    console.error('SOS dispatch failed:', errorText);
    process.exit(1);
  }

  const sosData = await sosRes.json();
  const sosId = sosData.sos_id;

  console.log('==================================================');
  console.log(`🚨 SOS ALERT DISPATCHED SUCCESSFULLY!`);
  console.log(`   SOS ID       : #${sosId}`);
  console.log(`   Patient Name : ${sosData.patient_name}`);
  console.log(`   Phone        : ${sosData.patient_phone}`);
  console.log(`   Description  : ${sosData.description}`);
  console.log(`   Location     : Lat ${sosData.latitude}, Lng ${sosData.longitude}`);
  console.log(`   Status       : ${sosData.status} (Dispatch: ${sosData.dispatch_status})`);
  console.log('==================================================');
  console.log('\n👉 NOW IN YOUR LOCAL ADMIN DASHBOARD (http://localhost:5173):');
  console.log('   1. Sign in (e.g. CityCare Super Specialty Hospital or Palghar Civil)');
  console.log('   2. Open "New Emergencies" in the sidebar');
  console.log(`   3. SOS #${sosId} will appear within 3 seconds`);
  console.log('   4. Click "View case" -> click "Accept Emergency"');
  console.log('\nWatching for dashboard acceptance in real-time...');

  // Poll backend until accepted or timeout (90 seconds)
  const startTime = Date.now();
  const pollInterval = setInterval(async () => {
    try {
      const checkRes = await fetch(`${apiUrl}/sos/${sosId}`);
      if (checkRes.ok) {
        const current = await checkRes.json();
        if (current.status === 'ACCEPTED' || current.dispatch_status === 'ACCEPTED') {
          clearInterval(pollInterval);
          console.log('\n--------------------------------------------------');
          console.log(`🎉 SOS #${sosId} WAS ACCEPTED BY HOSPITAL!`);
          console.log(`   Hospital ID  : ${current.accepted_hospital_id}`);
          console.log(`   Hospital Name: ${current.hospital?.name || 'Allocated Hospital'}`);
          console.log(`   Status       : ${current.status}`);
          console.log('--------------------------------------------------');
          console.log('End-to-end verification completed successfully.');
          process.exit(0);
        }
      }
    } catch {}

    if (Date.now() - startTime > 90000) {
      clearInterval(pollInterval);
      console.log('\nPolling timed out after 90 seconds. You can still accept the alert in the dashboard.');
      process.exit(0);
    }
    process.stdout.write('.');
  }, 2000);
}

main();

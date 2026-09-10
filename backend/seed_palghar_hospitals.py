# -*- coding: utf-8 -*-
"""
seed_palghar_hospitals.py
Inserts / updates genuine hospitals located in Palghar District and nearby areas,
along with sample ambulances and emergency doctors for each.
"""
import os
import psycopg2
from dotenv import load_dotenv
import bcrypt

load_dotenv('C:/Users/Admin/OneDrive/Desktop/GOne/backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

def get_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Real prominent hospitals in Palghar district and nearby
PALGHAR_HOSPITALS = [
    {
        "name": "Palghar District Civil & Trauma Hospital",
        "email": "palghar.civil@lifelink.gov.in",
        "address": "Near Kacheri Road, Palghar West, Maharashtra 401404",
        "latitude": 19.6968,
        "longitude": 72.7695,
        "total_beds": 200,
        "icu_beds": 35,
        "oxygen_beds": 45,
        "phone_number": "+91 2525 252244",
        "rating": 4.8,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-1001", "MH-48-AM-1002", "MH-48-AM-1003"],
        "doctors": [
            ("Dr. Rajesh Patil", "Emergency Medicine", "+91 9823011221"),
            ("Dr. Snehal Raut", "General Surgery & Trauma", "+91 9823011222"),
        ]
    },
    {
        "name": "Dr. M.L. Dhawale Memorial Hospital",
        "email": "mldhawale.palghar@gmail.com",
        "address": "Rural Homoeopathic Hospital, Palghar-Boisar Road, Palghar, Maharashtra 401404",
        "latitude": 19.7045,
        "longitude": 72.7663,
        "total_beds": 150,
        "icu_beds": 25,
        "oxygen_beds": 30,
        "phone_number": "+91 2525 256932",
        "rating": 4.7,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-2001", "MH-48-AM-2002"],
        "doctors": [
            ("Dr. Anand Kulkarni", "Emergency & Critical Care", "+91 9823022331"),
            ("Dr. Meera Joshi", "Pediatric Emergency", "+91 9823022332"),
        ]
    },
    {
        "name": "Thunga Hospital (Boisar - Tarapur)",
        "email": "thunga.boisar@gmail.com",
        "address": "Boisar-Tarapur Road, Near MIDC, Boisar, Palghar, Maharashtra 401501",
        "latitude": 19.7990,
        "longitude": 72.7485,
        "total_beds": 120,
        "icu_beds": 24,
        "oxygen_beds": 30,
        "phone_number": "+91 2525 661100",
        "rating": 4.9,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-3001", "MH-48-AM-3002"],
        "doctors": [
            ("Dr. Vikram Sharma", "Interventional Cardiology", "+91 9823033441"),
            ("Dr. Pooja Deshmukh", "Emergency Medicine", "+91 9823033442"),
        ]
    },
    {
        "name": "Anand Hospital & Critical Care",
        "email": "anandhospital.palghar@gmail.com",
        "address": "Mahim Road, Opp. ST Stand, Palghar West, Maharashtra 401404",
        "latitude": 19.6990,
        "longitude": 72.7710,
        "total_beds": 80,
        "icu_beds": 18,
        "oxygen_beds": 20,
        "phone_number": "+91 2525 254500",
        "rating": 4.6,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-4001"],
        "doctors": [
            ("Dr. Sachin Anand", "Critical Care & ICU", "+91 9823044551"),
        ]
    },
    {
        "name": "Sanjeevani Multispeciality Hospital",
        "email": "sanjeevani.boisar@gmail.com",
        "address": "Navapur Road, Near Railway Station, Boisar, Palghar, Maharashtra 401501",
        "latitude": 19.8020,
        "longitude": 72.7530,
        "total_beds": 100,
        "icu_beds": 20,
        "oxygen_beds": 25,
        "phone_number": "+91 2525 272800",
        "rating": 4.7,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-5001", "MH-48-AM-5002"],
        "doctors": [
            ("Dr. Ramesh Jadhav", "Orthopedics & Trauma", "+91 9823055661"),
        ]
    },
    {
        "name": "Kanta Hospital",
        "email": "kanta.hospital.palghar@gmail.com",
        "address": "Station Road, Near Flyover, Palghar West, Maharashtra 401404",
        "latitude": 19.6932,
        "longitude": 72.7681,
        "total_beds": 70,
        "icu_beds": 12,
        "oxygen_beds": 15,
        "phone_number": "+91 2525 251120",
        "rating": 4.5,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-6001"],
        "doctors": [
            ("Dr. Suresh Mehta", "General Physician & Emergency", "+91 9823066771"),
        ]
    },
    {
        "name": "Philia Hospital",
        "email": "philia.hospital.palghar@gmail.com",
        "address": "Tembhode Road, Palghar West, Maharashtra 401404",
        "latitude": 19.6950,
        "longitude": 72.7620,
        "total_beds": 65,
        "icu_beds": 14,
        "oxygen_beds": 16,
        "phone_number": "+91 2525 255400",
        "rating": 4.6,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-7001"],
        "doctors": [
            ("Dr. David Dsouza", "Emergency Care", "+91 9823077881"),
        ]
    },
    {
        "name": "Sub-District Hospital (Cottage Hospital Dahanu)",
        "email": "cottage.dahanu@lifelink.gov.in",
        "address": "Coastal Road, Near Beach, Dahanu, Palghar District, Maharashtra 401601",
        "latitude": 19.9725,
        "longitude": 72.7340,
        "total_beds": 110,
        "icu_beds": 20,
        "oxygen_beds": 25,
        "phone_number": "+91 2528 222055",
        "rating": 4.6,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-8001", "MH-48-AM-8002"],
        "doctors": [
            ("Dr. Sunil Naik", "Trauma & Emergency", "+91 9823088991"),
        ]
    },
    {
        "name": "Vedanta Institute of Medical Sciences & Hospital",
        "email": "vedanta.medical.dahanu@gmail.com",
        "address": "Village Dhunoli, Taluka Dahanu, Palghar District, Maharashtra 401606",
        "latitude": 19.8850,
        "longitude": 72.8420,
        "total_beds": 350,
        "icu_beds": 50,
        "oxygen_beds": 60,
        "phone_number": "+91 2528 245000",
        "rating": 4.9,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-9001", "MH-48-AM-9002", "MH-48-AM-9003"],
        "doctors": [
            ("Dr. Arvind Menon", "Critical Care & ICU", "+91 9823099001"),
            ("Dr. Kavita Verma", "Neuro & Emergency", "+91 9823099002"),
        ]
    },
    {
        "name": "Manor Trauma & Rural Hospital",
        "email": "manor.trauma@gmail.com",
        "address": "Mumbai-Ahmedabad Highway (NH-48), Manor, Palghar District, Maharashtra 401403",
        "latitude": 19.7420,
        "longitude": 72.9120,
        "total_beds": 90,
        "icu_beds": 16,
        "oxygen_beds": 20,
        "phone_number": "+91 2525 247100",
        "rating": 4.7,
        "password": "Demo@123",
        "ambulances": ["MH-48-AM-0001", "MH-48-AM-0002"],
        "doctors": [
            ("Dr. Pankaj Shah", "Highway Trauma & Emergency", "+91 9823000111"),
        ]
    }
]

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("Connected to Supabase PostgreSQL.")

    added_count = 0
    updated_count = 0

    for h in PALGHAR_HOSPITALS:
        p_hash = get_hash(h["password"])
        cur.execute("SELECT hospital_id FROM hospitals WHERE email = %s;", (h["email"],))
        existing = cur.fetchone()

        if existing:
            h_id = existing[0]
            cur.execute("""
                UPDATE hospitals
                SET name = %s, address = %s, latitude = %s, longitude = %s,
                    total_beds = %s, icu_beds = %s, oxygen_beds = %s,
                    phone_number = %s, rating = %s, password_hash = %s
                WHERE hospital_id = %s;
            """, (
                h["name"], h["address"], h["latitude"], h["longitude"],
                h["total_beds"], h["icu_beds"], h["oxygen_beds"],
                h["phone_number"], h["rating"], p_hash, h_id
            ))
            updated_count += 1
        else:
            cur.execute("""
                INSERT INTO hospitals (name, email, address, latitude, longitude,
                                       total_beds, icu_beds, oxygen_beds,
                                       general_occupied, icu_occupied, emergency_occupied,
                                       phone_number, rating, password_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, 0, 0, %s, %s, %s)
                RETURNING hospital_id;
            """, (
                h["name"], h["email"], h["address"], h["latitude"], h["longitude"],
                h["total_beds"], h["icu_beds"], h["oxygen_beds"],
                h["phone_number"], h["rating"], p_hash
            ))
            h_id = cur.fetchone()[0]
            added_count += 1

        # Seed ambulances
        for amb in h["ambulances"]:
            cur.execute("SELECT ambulance_id FROM ambulances WHERE hospital_id = %s AND vehicle_number = %s;", (h_id, amb))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO ambulances (hospital_id, vehicle_number, driver_name, driver_phone, status, location_label)
                    VALUES (%s, %s, 'Driver ' || %s, %s, 'AVAILABLE', 'Hospital Base');
                """, (h_id, amb, amb[-4:], h["phone_number"]))

        # Seed doctors
        for doc_name, doc_dept, doc_phone in h["doctors"]:
            cur.execute("SELECT doctor_id FROM doctors WHERE hospital_id = %s AND name = %s;", (h_id, doc_name))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO doctors (hospital_id, name, specialization, department, phone, status, current_cases)
                    VALUES (%s, %s, %s, 'Emergency', %s, 'AVAILABLE', 0);
                """, (h_id, doc_name, doc_dept, doc_phone))

    conn.commit()
    print(f"Palghar Hospitals Seed complete: {added_count} added, {updated_count} updated.")

    cur.execute("SELECT hospital_id, name, email, latitude, longitude, total_beds FROM hospitals ORDER BY hospital_id;")
    rows = cur.fetchall()
    print(f"\nTotal hospitals now in DB: {len(rows)}")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} | {r[2]} | ({r[3]}, {r[4]}) | Beds: {r[5]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

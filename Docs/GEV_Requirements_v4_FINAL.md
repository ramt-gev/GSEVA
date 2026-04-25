# GEV Integrated Campus Management System
## Complete Requirements Document — Version 4.0 (Final)

**Spiritual Patron:** HH Radhanath Swami  
**Final Authority (Project):** Vasudev Prabhuji (GAC)  
**IT Director:** Sri Gaurcaran P (GAC 4)  
**Project Coordinator:** Ram Prabhu (IT Software Head)  
**Document Version:** 4.2 — Group size, café capacity, Zone 3 upgrade, Smart Registration Page, Canteen App separation, April 2026  
**Status:** Complete — Ready for Developer Handover  
**Organisation:** Govardhan EcoVillage – ISKCON GEV, Galtare, Hamrapur, Wada, Palghar – 421303, Maharashtra  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Organisation Background](#2-organisation-background)
3. [Governance & Leadership](#3-governance--leadership)
4. [Complete Department Directory](#4-complete-department-directory--46-departments)
5. [Existing Technology Ecosystem](#5-existing-technology-ecosystem)
6. [Campus Zones & Access Control](#6-campus-zones--access-control)
7. [People Classification — 16 Types](#7-people-classification--16-types)
8. [Module 1 — Visitor Management (VMS)](#8-module-1--visitor-management-system-vms)
9. [Module 2 — Annakshetra & Food Service](#9-module-2--annakshetra--food-service-management)
10. [Module 3 — Festival & Event Management](#10-module-3--festival--event-management)
11. [Module 4 — Security & Police Reporting](#11-module-4--security--police-reporting)
12. [Module 5 — Vehicle Management](#12-module-5--vehicle-management)
13. [WhatsApp & Communication Layer](#13-whatsapp--communication-layer)
14. [Dashboard & Reports Library](#14-dashboard--reports-library)
15. [System Architecture & Integrations](#15-system-architecture--integrations)
16. [Technology Stack Recommendations](#16-technology-stack-recommendations)
17. [Budget & Implementation Roadmap](#17-budget--implementation-roadmap)
18. [Non-Functional Requirements](#18-non-functional-requirements)
19. [Open Questions — All Resolved](#19-open-questions--all-resolved)
20. [Document Sign-Off](#20-document-sign-off)

---

## 1. Executive Summary

Govardhan EcoVillage (GEV) is an internationally recognised spiritual, wellness, and sustainability community under ISKCON, located in Wada, Palghar, Maharashtra. The campus hosts a highly diverse population daily — from spiritual pilgrims and paying guests to resident staff families, construction labourers, international yoga groups, and brahmachari monks — with footfall reaching **15,000–20,000 on major festival days.**

This document defines the complete requirements for the **GEV Integrated Campus Management System (ICMS)** — a unified digital platform covering five primary modules:

| Module | Description |
|---|---|
| 🚪 Visitor Management (VMS) | Unified identity, 4-zone QR-based access control, 16 visitor types, contractor portal, police report |
| 🍲 Food Management (AMS) | Annakshetra B/D token system, 3 paid cafés integration, free meal headcount, nightly forecasting |
| 🎉 Festival Module | High-throughput batch entry, live crowd counting, 17-member committee dashboards, VIP management |
| 🔐 Security & Reporting | Monthly police report, campus resident register, audit trail, role-based access control (RBAC) |
| 🚗 Vehicle Management | Vehicle entry log, parking zone management, festival-day counter, e-cart scheduling |

**System Configuration:** Key values (max_group_size, zone3_cafe_price, vf_slot_capacity, festival_mode) stored in system_config table — Super Admin changes these via Admin Portal Settings. No code deployment needed.

**Two dedicated tablet apps:**
- Gate Tablet App — used by gate staff (Premanjan P team) at 4 gates. Pure access control.
- Annakshetra Canteen App — used by Anandprem P team at the food counter. Pure meal service management.
Both write to the same PostgreSQL database via the ICMS API.

**Integration-first design:** GEV already has Greythr HRMS, ESSL Biometric (API available), eZee Booking Engine, ManyChat Pro (WhatsApp), and Petpooja POS at two cafés. The ICMS integrates all five — no duplicate data entry across any system.

---

## 2. Organisation Background

GEV operates under four core pillars — Spirituality, Wellness, Sustainability, and Social Impact. Awards: UNWTO Award, WTM Responsible Tourism Global Winner, GRIHA Award, Golden Globe Tigers Award.

### Typical Daily Campus Population

| Category | Daily Count | Stay Type | Key System Need |
|---|---|---|---|
| Spiritual retreat / Room guests | 50–200 | 1–7 nights | eZee sync, C-Form, Zone 1–3 |
| Day visitors (paid ₹850) | 50–300 | Same day | Programme QR, tour guide scheduling |
| Free day visitors (darshan) | 50–200 | Same day | Walk-in registration, Zone 1–2 |
| Yoga / Ayurveda / Course students | 20–80 | Multi-day | Course enrollment, accommodation |
| Corporate groups | 10–100 | Day or overnight | Group bulk import |
| Devotees (pilgrimage) | 20–100 | Variable | Free lunch entitlement |
| Resident staff + dependants | 118 + 41 | Permanent | Greythr sync, B/D meal deduction |
| Volunteers / Seva participants | 34 active | Short/long-term | Seva application approval |
| Construction labourers | 50–200 | Project duration | Contractor portal, Camp A/B |
| Brahmacharis (monks) | 55 | Permanent ashram | Ashram kitchen fixed count |
| Varishtha Vaishnavas | 19 | VVSHCH building | Kitchen fixed count |
| Vendors / suppliers | 5–30 | Day visits | WhatsApp day pass, vehicle log |

---

## 3. Governance & Leadership

### 3.1 Governance Hierarchy

**Spiritual Patron & Board of Directors:** HH Radhanath Swami  
BoD Members: Krsna Candra P, Kesava P, Radha Giridhari P, Sacitananda P, Madhavananda P, Adikesava P, Krsna Naam P, Vrajsundar P, Priyavrat P, Sanatkumar P, Gauranga P, Radhakunda P  
BoD Secretaries: Vasudev P, Mohan Vilas P

**GEV Administrative Council (GAC) — 16 Members:**  
Sanatkumar P · Gauranga P · Vasudev P · Sri Gaurcaran P · Adikeshav P · Caitanyarupa P · Gauranga Darshan P · Devarshi Narad P · Sri Gurucaran P · Madhav Gaur P · Maha Bhagavat P · Ajit Mukund P · Sushant Nitai P · Premlila M · Barsana Kumari M · HariPriya Radha M

**Project Final Authority:** Vasudev Prabhuji (GAC 3)  
**IT Director (GAC):** Sri Gaurcaran P (GAC 4)  
**Project Coordinator / IT Software Head:** Ram Prabhu (reports to Sri Gaurcaran P)  
**IT Infrastructure HOD:** Radhashyamsundar P  
**HR HOD:** Radhashyamsundar P  

### 3.2 Complete GAC — 16 Members with Departments

| GAC # | Name | Key Departments |
|---|---|---|
| GAC 1 | Sanatkumar P | Rural Development, Goshala (co), Agriculture, Deity Flower (co), Nursery & VF (co), Food Stalls (co) |
| GAC 2 | Gauranga P | Kitchen, Annakshetra, Guest Hospitality, CSR, Varishtha Vaishnava Care (co), Construction (co) |
| GAC 3 | Vasudev P | Accounts, Srinathji Bhavan, Central Purchase, Vehicle Dept, Master Planning, Construction (co) |
| GAC 4 | Sri Gaurcaran P | IT/HR Director, Construction (co), Estate Management, Civil Material Purchase, Dham Seva, Media (co), Godown Purchases |
| GAC 5 | Adikeshav P | Community Dev, Govardhan School of Yoga (co), Ayurveda, Cleanliness, Health & Spiritual Care, Varishtha Vaishnava (co) |
| GAC 6 | Caitanyarupa P | Seva Office, Sustainability, SBT & Waste Mgmt (co), Campus Preaching (co), Volunteering (co) |
| GAC 7 | Gauranga Darshan P | GSEC, Shastric Education, Vidyapeetha |
| GAC 8 | Devarshi Narad P | Local PR, Goshala (co), Legal Liaisoning |
| GAC 9 | Sri Gurucaran P | ISKCON Govardhan Ashram (guest rooms), Govardhan School of Yoga, Maintenance Construction, Govinda's Guest Area |
| GAC 10 | Madhav Gaur P | Dioramas, SBT & Waste Mgmt (co), Nursery & VF (co), Deity Flower (co), Food Stalls (co) |
| GAC 11 | Maha Bhagavat P | Brahmachari Ashram, Temple Hall & Sound, HRDI, Construction (co), Kirtan (co) |
| GAC 12 | Ajit Mukund P | GEMS (English Medium School), HRDI (co), Campus Preaching (co), Book Distribution |
| GAC 13 | Sushant Nitai P | Deity Worship, VF Temples, Festivals, Deity Cooking (co), Yajya, Madhuram |
| GAC 14 | Premlila M | Community Dev (co), Health & Spiritual Care, POSH & CPT |
| GAC 15 | Barsana Kumari M | Volunteering (co), Kirtan (co), Deity Cooking (co) |
| GAC 16 | HariPriya Radha M | ISKCON Ashram (co), Gift Shops, IGA Volunteering, Media (co) |

> **Note:** Sri Gaurcaran P (GAC 4) and Sri Gurucaran P (GAC 9) are **two different people**. Different names — "Gaur" vs "Guru". Confirmed from official PPTX and Excel documents dated 24 April 2026.

---

## 4. Complete Department Directory — 46 Departments

### Food & Hospitality

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 1 | Annakshetra | ANNAK | Gauranga P | Anand Prem P |
| 2 | Kitchen (Festival & Daily Cooking) | KITCHEN | Gauranga P | Hari Guru P |
| 3 | Guest Hospitality | GHOSP | Gauranga P | Mohan Villas P |
| 4 | Govinda's Srinathji Bhavan (Café) | GSB | Vasudev P | Ramesh P |
| 5 | Govinda's Guest Area (Café) | GGA | Sri Gurucaran P | Prasad Panda P |
| 6 | Dhanvantari Café (Ayurveda Dept) | DHAN | Adikeshav P | Ganesh Ghosh P |

### Construction & Maintenance

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 7 | Construction Department | CONST | Gauranga P · Vasudev P · Sri Gaurcaran P · Maha Bhagavat P | Anandnimai P |
| 8 | Maintenance Construction | MAINT | Sri Gurucaran P | Laxmanpran P |
| 9 | Civil Material Purchases | CIVPURCH | Sri Gaurcaran P | Subal Sakha P |

### Administration & IT

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 10 | IT Infrastructure | IT_INFRA | Sri Gaurcaran P | Radhashyamsundar P |
| 11 | IT Software | IT_SW | Sri Gaurcaran P | Ram Prabhu |
| 12 | HR Department | HR | Sri Gaurcaran P | Radhashyamsundar P |
| 13 | Front Desk / Reception | FRONT | Sri Gurucaran P | Prasad Panda P |
| 14 | Accounts & Finance | ACCOUNTS | Vasudev P | Gauranga Lila P |
| 15 | Estate Management | ESTATE | Sri Gaurcaran P | Sri Gaurcaran P |
| 16 | Legal Liaisoning | LEGAL | Devarshi Narad P | Audarya Caitanya P |
| 17 | Central Purchase | CPURCH | Vasudev P | Braj Sakha P |
| 18 | Godown Purchases | GODOWN | Sri Gaurcaran P | Parth Sakha P |
| 19 | Vehicle Department | VEHICLE | Vasudev P | Vaishnav Sevak P |
| 20 | Media Department | MEDIA | Sri Gaurcaran P · HariPriya Radha M | Ganganath Caitanya P |

### Spiritual & Community Care

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 21 | ISKCON Govardhan Ashram (Guest Rooms) | ASHRAM | Sri Gurucaran P · HariPriya Radha M | Veera Arjuna P |
| 22 | Brahmachari Ashram | BRACHRAM | Maha Bhagavat P | Madhav Prem P |
| 23 | Varishtha Vaishnava Care (VVSHCH) | VVSHCH | Gauranga P · Adikeshav P | Achyuta Avtar P (Achyut Patil) |
| 24 | Deity Worship Department | DEITY | Sushant Nitai P | Deity Worship Committee |
| 25 | Deity Cooking | DEITYCOOK | Sushant Nitai P · Barsana Kumari M | Vrindavan Priti M |
| 26 | Temple Hall & Sound System | TEMPLE | Maha Bhagavat P | Sri Kesavanand P |
| 27 | Kirtan Department | KIRTAN | Maha Bhagavat P · Barsana Kumari M | Jay Sacinandan P |
| 28 | Health & Spiritual Care | HSC | Premlila M | Sridhar Nimai P |
| 29 | Festival Department | FESTIVAL | Sushant Nitai P | Festival Committee (Sanatkumar P Chair) |

### Education & Training

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 30 | Govardhan School of Yoga (incl. Int'l TTC Nov–Feb) | GSYOGA | Sri Gurucaran P | Priya Caitanya P |
| 31 | Govardhan Ayurveda | AYUR | Adikeshav P | Dr. Sudheesh |
| 32 | GSEC (School of Education & Culture) | GSEC | Gauranga Darshan P | Gauranga Darshan P |
| 33 | Vidyapeetha (Long-term Spiritual — 2m to 2yr) | VIDYA | Gauranga Darshan P | Gaurangabihari P (HOD), Gauranga Darshan P (Dean) |
| 34 | HRDI | HRDI | Ajit Mukund P · Maha Bhagavat P | Abhimanyu Pran P |
| 35 | GEMS (Govardhan English Medium School) | GEMS | Premlila M | Amolcaitanya P |
| 36 | Leadership Training Academy | LTA | Gauranga P | Mohan Vilas P |

### Sustainability, Goshala & Grounds

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 37 | Sustainability | SUST | Caitanyarupa P | Caitanyarup P (project HOD) |
| 38 | SBT & Waste Management | SBT | Caitanyarupa P · Madhav Gaur P | Ganga Narayan P |
| 39 | Goshala | GOSHA | Sanatkumar P · Devarshi Narad P | Srinandanandan P |
| 40 | Nursery, Landscape & Vrindavan Forest | NURSERY | Sanatkumar P · Madhav Gaur P | Abhay Gauranga P |
| 41 | Agriculture | AGRI | Sanatkumar P | Prem Prada P |
| 42 | Dioramas | DIORAMA | Madhav Gaur P · Sushant Nitai P | — |

### Social Impact & Community

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 43 | Rural Development | RURAL | Sanatkumar P | Jadu Thakur P & Mohan Nimai P (co-HODs) |
| 44 | Rural Education | RURALEDU | Sanatkumar P | Nitai Caitanya P |
| 45 | CSR | CSR | Gauranga P | Anand Caitanya P |

### Security & Operations

| # | Department | Code | GAC Member | HOD |
|---|---|---|---|---|
| 46 | Security & Parking | SECUR | Direct | Premanjan P |

> **Excluded:** Govardhan Skill Centre (separate entity 1.5km offsite — not in VMS scope)

---

## 5. Existing Technology Ecosystem

| System | Current Use | Status | ICMS Integration |
|---|---|---|---|
| Greythr HRMS | Employee records, payroll, attendance | **Exists** | Webhook → auto-create/update/deactivate staff profiles. No re-registration. |
| ESSL Biometric | Payroll staff + weekly dept labourer attendance. **API available.** | **Exists** | ESSL API → weekly labourer list → VMS profiles auto-created |
| eZee Booking Engine | Room bookings — direct + OTA (MakeMyTrip, Goibibo) | **Exists** | eZee webhook → guest profile → WhatsApp pre-arrival → QR on check-in date |
| ManyChat Pro | WhatsApp chatbot (enquiries), social media (IG, FB). Chatbot on both websites. | **Extend** | Retain for social media / marketing. New VMS operational flows via Interakt. |
| Interakt (New — Indian BSP) | Not yet in use | **New** | All 14 VMS WhatsApp operational flows |
| Petpooja POS | Billing at Govinda's Srinathji Bhavan & Govinda's Guest Area | **Extend** | Petpooja API → daily sales → ICMS café dashboard. Dhanvantari: Phase 2. |

---

## 6. Campus Zones & Access Control

### 6.1 Four Campus Zones

| Zone | Name | Area | Entry Method |
|---|---|---|---|
| Zone 1 | Open | Post Main Gate — Temples, Small Goshala (6 cows), Annakshetra (Lalita Bhavan), Govinda's Srinathji Bhavan, Khichadi counter | No QR — open walk-in |
| Zone 2 | Gate 7 (Vrindavan Forest) | Vrindavan Forest, SBT area, Labour Camp A, Engineering Block, Dioramas, Nursery | QR scan mandatory at Gate 7 |
| Zone 3 | SBT Gate (Restricted) | Guest accommodation, Full Goshala (110 cows & bulls), Swimming Pool, Govinda's Guest Area, Dhanvantari Café | QR mandatory — day visitors blocked unless café pass purchased at main gate |
| Zone 4 | Adjacent Property | Payal Bhavan (GEV Quarters), Govardhan Kunj (separate society) | Residents of those buildings only |

### 6.2 Zone Access Rules by Visitor Type

| Visitor Type | Zone 1 | Zone 2 | Zone 3 | Zone 4 |
|---|---|---|---|---|
| Free Day Visitor | ✅ | ✅ VMS registered | ❌ (unless café pass) | ❌ |
| Paid Day Visitor (₹850) | ✅ | ✅ Full programme | ✅ Goshala + pool + tour | ❌ |
| Room Booking Guest | ✅ | ✅ | ✅ Full | ❌ |
| Course Student (residential) | ✅ | ✅ | ✅ Accommodation zone | As assigned |
| Volunteer / Seva | ✅ | ✅ | ✅ As per seva dept | If assigned |
| Resident Staff | ✅ | ✅ | ✅ Full | If resident |
| Staff Dependant | ✅ | ✅ | ✅ Residential zone | If resident |
| Brahmachari / Varishtha Vaishnava | ✅ | ✅ | ✅ Ashram / VVSHCH | — |
| Construction / Maintenance Labourer | ✅ | ✅ Work areas | ✅ Work areas only | ❌ |
| Weekly Labourer (local) | ✅ | As assigned | ❌ | ❌ |
| Weekly Labourer (outstation) | ✅ | As assigned | As assigned | ❌ |
| Vendor / Supplier | ✅ Delivery area | ❌ | ❌ | ❌ |
| Corporate / Tour Group | ✅ | ✅ | ✅ If overnight | ❌ |
| VIP / Dignitary | ✅ | ✅ | ✅ Full (escorted) | — |

### 6.3 Zone 3 Upgrade — SBT Gate Self-Upgrade (Updated v4.1)
Any Zone 1+2 visitor can upgrade to Zone 3 directly at the SBT Gate — no reception visit needed.

**Upgrade process:**
1. Visitor scans existing Zone 1+2 QR at SBT Gate → denied
2. Gate tablet shows upgrade screen automatically: "Govinda's Guest Area lunch = ₹350 × [group_size] persons = ₹[total]"
3. Visitor pays via UPI QR on gate tablet (Razorpay)
4. Zone 3 activated on existing QR → valid for 3 hours
5. WhatsApp confirmation sent to visitor

**Capacity control:** Govinda's Guest Area manager declares daily meal threshold each morning in the system. If threshold reached → upgrade screen shows "Fully booked today" and suggests alternatives.

**Pricing:** ₹350/person (Govinda's Guest Area lunch cost). Stored in system_config.zone3_cafe_price — changeable by Super Admin without code deployment. Receptionist logs visitor details, collects payment, issues a **time-limited 3-hour Zone 3 café pass**. Tracked in VMS as "Café Access Pass" with payment amount and café name.

---

## 7. People Classification — 16 Types

| Type | Name | Registration Source | Key Details |
|---|---|---|---|
| 1 | Room Booking Guest | eZee → VMS | Zone 1–3 full. Paid cafés. C-Form. Police report. |
| 2 | Free Day Visitor | Walk-in / WhatsApp | Zone 1–2. Free lunch. Same-day exit. No police report. |
| 3 | Paid Day Visitor (₹850) | Website / WhatsApp / gate | Zone 1–3. Govinda's lunch included. Cart + tour guide. |
| 4 | Course Student | Course booking → VMS | Yoga, Ayurveda, Sound Healing, Spiritual, Kids Camps, TTC. Residential or day scholar. |
| 5 | Volunteer / Seva | iskcongev.com/volunteer → Balaji Govind P approval | Free Annakshetra B/D. Police report. |
| 6 | Sustainability Intern | Same as volunteer | 3–6 months, 15–20/year, under Caitanyarup P. |
| 7 | Resident Staff (Payroll) | Greythr → VMS | Permanent. B/D salary deduction. Police report. |
| 8 | Staff Dependant | Staff registers in VMS | Name, age, gender, relation. Police report. |
| 9 | Brahmachari (Monk) | Ashram In-charge → VMS | 55 currently. Madhav Prem P. Separate kitchen. Police report. |
| 10 | Varishtha Vaishnava | VVSHCH Manager → VMS | 19 currently. Achyut Patil. VVSHCH building. Monthly rent includes meals. |
| 11 | Weekly Labourer — Local | ESSL → VMS read | Day only — goes home evenings. No overnight VMS profile. |
| 12 | Weekly Labourer — Outstation | HOD manual registration | Stays overnight. Police report. B/D if opted. |
| 13 | Construction Labourer | Contractor portal bulk upload | Camp A (inside) or Camp B (1.5km outside — both police report). B/D free. |
| 14 | Vendor / Supplier | WhatsApp day pass → admin approval | Vehicle log. Day only. |
| 15 | Corporate / Tour Group | Group leader registers + bulk member upload | Group leader QR + individual member QRs. |
| 16 | VIP / Dignitary | Manual admin registration | Full campus (escorted). WhatsApp arrival alert to receiving team. |

### Universal Person Profile Fields

| Field Group | Fields | Mandatory For |
|---|---|---|
| Basic Identity | Full name, gender, age, photo, mobile (WhatsApp) | All types |
| ID Proof | Type, number, scanned copy | All overnight; Aadhaar mandatory for labourers |
| Address | Permanent address, city, state, pincode | All overnight-stay types |
| Date of Birth | DD/MM/YYYY | All overnight-stay types |
| Classification | Primary type, sub-type, department, sub-department | All |
| Campus Location | Building / area where staying or working | All overnight-stay types |
| Stay Duration | Start date, expected end date | All except permanent staff + dependants |
| Staff Dependants | Relation to staff, staff member ID | Dependants only |
| Day Scholar Host | Host staff person ID + location in GEV | Day scholar edge cases |
| Meal Profile | Annakshetra B/D opted, meal type, payment method | All eligible types |
| Group Info | Group name, leader ID, group size (mandatory), max group size enforced by system_config | All day visitor types + corporate / tour / TTC groups |
| Group Member Details | For each member: full name, age, gender, relation to leader | All groups of 2+ persons. Stored in group_members table. |
| Lunch Pre-indication | Whether visitor plans to take Annakshetra free lunch (for planning) | Day visitors during registration |

---

## 8. Module 1 — Visitor Management System (VMS)

### 8.1 Paid Day Visit — ₹850 Programme Schedule

| Time | Activity | Zone |
|---|---|---|
| 10:00–10:30 AM | Temple Darshans (Radha Vrindavanbehari & Radha Madanmohan) | Zone 1 |
| 10:30–11:00 AM | Traditional Relaxation — Yoga Nidra | Zone 1 |
| 11:00 AM–1:00 PM | GEV Tour — Full Goshala (110 cows), Sustainability, Dioramas (exclusive tour guide) | Zone 3 + Zone 2 |
| 1:00–2:30 PM | Lunch Prasad at Govinda's (included in ₹850) | Zone 3 |
| 2:30–3:30 PM | Mahabharat Drama Video + GEV Inspirational Video | Zone 1 |
| 3:30–4:45 PM | Meditation, Pranayama, Interactive Gita Workshop | Zone 1 |
| 4:45–6:00 PM | Vrindavan Forest Temples + Govardhan Parikrama | Zone 2 |
| 6:00–6:30 PM | Sri Govardhan & Yamuna Aarti | Zone 2 |

> Payment currently collected at gate/reception (cash/UPI). Phase 3: online pre-booking via Interakt + Razorpay.

### 8.1a Smart Registration Page — Day Visitor Self-Registration

**What it is:** A mobile-optimised single-page web form. Visitor scans QR poster at Main Gate → WhatsApp opens → bot sends registration link → visitor opens link on phone → fills form → gets QR on WhatsApp. Takes 90 seconds.

**Not a PWA** — a simple webpage. Visitor uses it once and closes it. No install needed.

**Fields collected:**
- Name + mobile (auto-filled from WhatsApp link)
- Number of persons in group (1 to system max, default max = 10, Super Admin configurable)
- For each group member: full name, age, gender, relation to leader
- Visit type: Free darshan OR Paid ₹850 programme
- Services wanted: Annakshetra lunch (pre-indication) · VF Tour (slot selection) · Zone 3 café (with real-time availability check)
- Payment: Razorpay inline for ₹850 programme OR Zone 3 café pass (₹350 × persons)

**Real-time checks before submission:**
- VF tour slot availability (live from vf_tour_slots table)
- Govinda's Guest Area capacity (live from cafe_capacity table)
- Max group size cap (from system_config table)

**On submission:**
- ICMS API creates person profile + group_members records + qr_passes record
- If VF tour: reserves slot (vf_slot_bookings INSERT)
- If Zone 3 café: books capacity (cafe_capacity.booked_count +group_size)
- QR pass image sent to leader's WhatsApp via Interakt

**Fallback:** Gate staff can open same URL on their tablet and register visitor manually.

### 8.2 Contractor Self-Service Portal Workflow

```
Prashant Hake / Sohanjit (Construction) OR Laxmanpran / Hitesh (Maintenance)
  → shares contractor portal link with contractor company via WhatsApp
  → Contractor logs in → bulk uploads worker list (Excel/CSV):
       Name, Aadhaar, Photo, Phone, Gender, Project, Department, Start & End date
  → HOD approval queue in VMS admin portal
  → Anandnimai P (Construction) OR Laxmanpran P (Maintenance) reviews & approves
  → QR pass sent to each worker's WhatsApp automatically
  → Zone access activated: full campus (work areas)
  → Annakshetra B/D: Camp A = default ON (can opt out); Camp B = default OFF (can opt in)
  → On project end date: all QR passes auto-deactivated + clearance checklist triggered
```

### 8.3 Free vs Paid Day Visitor Access Summary

| Area / Activity | Free Day Visitor | Paid Day Visitor (₹850) |
|---|---|---|
| Temples (Radha Vrindavanbehari, Madanmohan) | ✅ | ✅ |
| Small Goshala (6 cows — grass feeding) | ✅ | ✅ |
| Vrindavan Forest Tour (Gate 7) | ✅ (VMS registered) | ✅ |
| SBT Area | ✅ (up to SBT) | ✅ |
| Full Goshala (110 cows) | ❌ | ✅ |
| Swimming Pool | ❌ | ✅ |
| Cart Facility | ❌ | ✅ |
| Lunch at Govinda's (included) | ❌ (self-pay) | ✅ (included) |
| Free Lunch at Annakshetra | ✅ | ✅ |
| Free Khichadi | ✅ | ✅ |
| Spiritual programmes (Yoga Nidra, Gita Workshop, Aarti) | ❌ | ✅ |
| Guest accommodation zone (Zone 3+) | ❌ | ❌ |

---

## 9. Module 2 — Annakshetra & Food Service Management

> **Important — Annakshetra Scanning Policy (Updated v4.1):**
> All meals at Annakshetra require QR scan — including Free Lunch and Khichadi.
> Breakfast/Dinner: Billing-relevant (registered count = amount billed to dept/contractor).
> Free Lunch/Khichadi: Statistics and pattern analysis only — no billing.
> Tap counter = fallback only for visitors without QR (festival walk-ins etc.).
> ₹1,860/person/month = Breakfast + Dinner only. Lunch is free and not recovered.

> **Important:** Annakshetra Breakfast and Dinner is a **paid, pre-registered service** — NOT free. Room guests and day visitors use the three paid cafés. Free Lunch and Khichadi are open to absolutely everyone — no registration required.

### 9.1 Complete Food Service Map

| Service | Location | Timings | For Whom | Cost | System |
|---|---|---|---|---|---|
| Free Khichadi (AM) | Annakshetra area | 9:30 AM – 12:30 PM | ALL — QR scan primary (statistics). Tap counter = fallback | Free | QR scan + tap fallback |
| Free Lunch Prasadam | Annakshetra — Lalita Bhavan | 12:45 PM – 2:30 PM | ALL — QR scan primary (statistics). Tap counter = fallback | Free | QR scan + tap fallback |
| Free Khichadi (PM) | Annakshetra area | 4:00 PM – 7:30 PM | ALL — QR scan primary (statistics). Tap counter = fallback | Free | QR scan + tap fallback |
| Annakshetra Breakfast | Annakshetra — Lalita Bhavan | 7:15 AM – 8:15 AM | Registered only: Staff, Volunteers, Construction Labourers (on campus), Outstation Weekly Labourers | Paid (see matrix) | QR token scan — pre-registered only |
| Annakshetra Dinner | Annakshetra — Lalita Bhavan | 6:30 PM – 7:15 PM | Same as Breakfast | Paid | QR token scan — pre-registered only |
| Govinda's Srinathji Bhavan | Zone 1 (near temples) | B: 8:15 AM–12 PM / L: 12–2:30 PM / D: 3–8 PM | All visitors (paid) | B: ₹60 / L: ₹100 / D: ₹100 | Petpooja POS → ICMS |
| Govinda's Guest Area (capacity-managed) | Zone 3 (guest area) | B: 8–9:30 AM / L: 1–2:30 PM / D: 7:30–9 PM | All (paid) — Zone 3 access needed | Paid (Petpooja) | Petpooja POS → ICMS |
| Dhanvantari Café | Zone 3 (Ayurveda area) | B: 8–9 AM / L: 1–2 PM / D: 6–7:30 PM | All (paid) — Zone 3 access needed | Paid (manual → Phase 2 Petpooja) | Phase 2 POS migration |
| Ashram / VVSHCH Kitchen | Brahmachari Ashram + VVSHCH | B: 7:30 AM / Brunch: 9:30 AM / D: 4:30 PM | Brahmacharis (55) + Varishtha Vaishnavas (19) = 74 fixed | Ashram covered / Monthly rent | Fixed count — updated by in-charge only |

### 9.2 Annakshetra B/D Payment Matrix

| Category | Payment Method | System Action |
|---|---|---|
| Payroll Staff | Monthly salary deduction via Greythr payroll | ICMS flags monthly deduction to Greythr payroll run |
| Volunteers / Seva | Free — dept they serve pays Annakshetra directly | Token marked "Dept-sponsored" — dept code tagged |
| Construction Labourers | B+D complimentary — contractor billed ₹1,860/person/month. Lunch free (unrecovered). Must register. | Token marked "Free-welfare" — monthly bill to contractor. Anandnimai P recovers from contractor. |
| Outstation Weekly Labourers | Free if staying on campus | Token marked "Free-welfare" — dept HOD tagged |
| Brahmacharis | Ashram covered — separate kitchen (fixed count) | Fixed count updated by Madhav Prem P only |
| Varishtha Vaishnavas | Included in monthly rent to VVSHCH | Fixed count updated by Achyut Patil only |

### 9.3 Automated Nightly Meal Forecast

System auto-generates at 9 PM and sends via WhatsApp to Anand Prem P (Annakshetra Head):
- **Free Khichadi/Lunch:** Historical average + confirmed bookings + festival multiplier
- **Annakshetra B/D:** Exact count from active registrations in VMS — no estimation needed
- Weekly forecast accuracy report: Forecasted vs. Actual

---

## 10. Module 3 — Festival & Event Management

**Critical scale:** Janmashtami: 15,000–20,000. New Year/holidays: 10,000–12,000. Other Vaishnava festivals: 4,000–5,000. Festival Mode switches to high-throughput batch entry — individual QR scanning at Main Gate is not feasible at this scale.

### Festival Committee — VMS Dashboard Access

| Member | Role | VMS Access |
|---|---|---|
| Sanatkumar P | Chairman | Full festival dashboard |
| Vasudev Prabhuji | Vice Chairman | Full festival dashboard |
| Caitanyarupa P | Secretary | Registration counts, coordination reports |
| Premanjan P | Security & Parking | Live gate count, zone capacity, parking, emergency broadcast |
| Hariguru P | Prasad Menu & Cooking | 3-day advance meal forecast |
| Madhav Gaur P | Prasad Distribution | Live distribution counter |
| Abhimanyupran P | Prasad Transfer | Transfer quantity log |
| Ganganarayan P | Food Waste Collection | Waste tally vs. served count |
| Venudhari P | Plate Collection & Cleaning | Plate count tracker |
| Audaryacaitanya P & Jaduthakur P | VIP Guests | VIP list, arrival alerts, escort coordination |
| Barsana Kumari M | Festival Bhoga Cooking | Ingredient requirement linked to forecast |
| Sarvjna Keshav P | Purchases | Purchase quantity estimate |
| Ajitmukund P & Devarshi Narad P | Ushering | Zone-wise crowd count |
| Srigaurucaran P | Pandal, Stage & Arrangements | Setup checklist |
| Laxmanpran P | Maintenance | Infrastructure alerts |
| Nitaicaitanya P | Preaching | — |
| Hemrupcaitanya P | Cultural Programs | — |

---

## 11. Module 4 — Security & Police Reporting

**Responsible:** Premanjan P (Security HOD) | Legal: Audarya Caitanya P (under Devarshi Narad P GAC 8)

### Police Report — Required Fields

| Field | Source | Mandatory For |
|---|---|---|
| Full name | VMS person profile | All overnight |
| Date of birth | VMS person profile | All overnight |
| Gender | VMS person profile | All overnight |
| Department / relation to GEV | VMS classification | All overnight |
| Permanent address + City, State, Pincode | VMS person profile | All overnight |
| Date of arrival | VMS check-in log | All overnight |
| Expected duration of stay | VMS stay record | All overnight |
| Accommodation block / room | VMS accommodation | All overnight |
| ID proof type & number | VMS person profile | All overnight |
| Contractor company | VMS contractor record | Construction labourers |

**Populations included:** Payroll staff + dependants · Brahmacharis · Varishtha Vaishnavas · Volunteers/Seva · Residential course students · Construction labourers (Camp A + Camp B 1.5km outside) · Outstation weekly labourers · Room booking guests (C-Form) · Short-term Seva · Corporate overnight groups.

**Report generation:** Auto-generated 1st of each month. Custom date range available. Export: PDF (police submission) + Excel (internal). Access: Premanjan P + Ram Prabhu only.

---

## 12. Module 5 — Vehicle Management

| Day Type | Volume | System Mode |
|---|---|---|
| Weekdays | < 100 vehicles | Standard log — number, type, driver, purpose, entry/exit time |
| Weekends | 400–500 vehicles | Zone management — parking capacity display + alerts |
| Festival days | 1,000+ vehicles | Festival mode — multi-lane counter, zone-full alerts, overflow management |

**GEV own fleet:** E-cart (room guest movement), tractors, campus utility vehicles — permanently registered. Vehicle Dept HOD: Vaishnav Sevak P (under Vasudev P GAC).

---

## 13. WhatsApp & Communication Layer

**Platform decision:** ManyChat Pro for social media marketing (IG, FB, general enquiries). Interakt for all VMS operational WhatsApp flows. Both connect to ICMS via webhooks.

| Flow | Platform | Trigger | Output |
|---|---|---|---|
| Walk-in visitor registration | Interakt | QR poster scan at Main Gate | Type selection → data collect → QR pass sent |
| Pre-arrival guest onboarding | Interakt | eZee booking webhook | Checklist + ID upload + QR on check-in date |
| Paid day visit booking | Interakt | WhatsApp enquiry / website | Schedule → payment link → QR pass |
| Gate 7 VF tour slot booking | Interakt | Visitor request | Slot selection → confirmation → Gate 7 QR activated |
| Contractor daily muster | Interakt | Daily 7:00 AM auto-trigger | Supervisor replies count → tokens generated → alert if excess |
| Vendor day pass | Interakt | Vendor WhatsApp request | Details → admin approval → day QR sent |
| Annakshetra B/D registration | Interakt | Eligible person opts in | Eligibility check → meal plan activated → tokens generated |
| Nightly meal forecast | Interakt | Daily 9:00 PM auto | Tomorrow's B/D exact counts (dept-wise) + estimated free meal counts → Anand Prem P + Hari Guru P |
| Festival pre-registration | Interakt | Opens 7 days before festival | Registration → festival QR pass sent |
| VIP arrival alert | Interakt | VIP gate scan | Alert to Audaryacaitanya P & Jaduthakur P |
| Departure feedback | Interakt | Exit gate scan / key return | Star rating + comment request |
| Temporary Zone 3 café pass | Interakt | Receptionist triggers after payment | 3-hour Zone 3 QR pass sent to visitor |
| General visitor enquiries | ManyChat | Website chatbot, social media DM | FAQ, booking info, directions |
| Social media broadcasts | ManyChat | Manual by Radhakripa P | Event announcements, course promotions |

---

## 14. Dashboard & Reports Library

| Report | Frequency | Key Content | Audience |
|---|---|---|---|
| Daily Campus Occupancy | Daily auto 9 PM | Count by all 16 visitor types, zone-wise | Management, Security |
| Gate Activity Log | Daily | All entry/exit events, denied entries | Premanjan P, Admin |
| VF Tour Slot Utilisation | Daily | Bookings vs. actual per slot, free vs. paid | Tour team, Priya Caitanya P |
| Contractor Camp Strength | Daily | Registered vs. actual, company-wise | Anandnimai P, Laxmanpran P |
| Annakshetra B/D Consumption | Daily | Registered vs. served, payment-type breakdown | Anand Prem P |
| Free Meals Served | Daily | Free lunch + Khichadi AM + PM counts | Anand Prem P, Finance |
| Meal Forecast vs. Actual | Weekly | Accuracy %, wastage estimate | Annakshetra, Management |
| Café Revenue Summary | Weekly | Meals served × price by café (Petpooja) | Finance, Accounts |
| eZee Guest Occupancy | Weekly | Current + upcoming, OTA vs direct | Front Desk, Prasad Panda P |
| Volunteer / Intern Status | Weekly | Active, pending approval, upcoming departures | Balaji Govind P |
| Overstay Alerts | Real-time | Guests past check-out without exit | Front Desk |
| Monthly Visitor Statistics | Monthly | Total by type, source, repeat vs. new | Management |
| Monthly Prasadam Service Report | Monthly | Total free meals, cost per category — donor format | Finance, ISKCON, Donors |
| **Monthly Police Resident Report** | **Monthly (1st)** | **All overnight campus residents — complete details** | **Premanjan P → Local Police** |
| Audit Trail Log | On-demand | Every action by every user — who, what, when, device | Ram Prabhu (Super Admin only) |
| Festival Post-Event Report | Post-event | Total footfall, prasad served, peak hour, cost per person | Festival Committee |
| Annual Community Report | Annual | All statistics for ISKCON, awards, donors | Vasudev Prabhuji |

---

## 15. System Architecture & Integrations

```
┌──────────────────────────────────────────────────────────────────────┐
│              GEV INTEGRATED CAMPUS MANAGEMENT SYSTEM (ICMS)          │
├─────────────┬──────────────────┬──────────────┬──────────────────────┤
│  Interakt   │  Web Admin       │  Gate &       │  ManyChat Pro        │
│  (WhatsApp  │  Portal          │  Canteen      │  (Social media +     │
│  ops flows) │  (Staff)         │  Tablets(PWA) │  general enquiries)  │
├─────────────┴──────────────────┴──────────────┴──────────────────────┤
│                        ICMS CORE APPLICATION                         │
│  VMS + Zone Control  |  AMS — Annakshetra + 3 Cafés  |  Festival     │
│  Security + Police + RBAC  |  Vehicle Mgmt  |  Reports + Dashboard   │
│          UNIFIED PERSON IDENTITY DATABASE (PostgreSQL)               │
├──────────────────────────────────────────────────────────────────────┤
│              INTEGRATION LAYER — 5 EXTERNAL SYSTEM APIs              │
│  Greythr HRMS  |  ESSL Biometric  |  eZee Booking  |  Interakt  |   │
│  Petpooja POS                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 16. Technology Stack Recommendations

| Layer | Recommended Technology | Reason |
|---|---|---|
| WhatsApp — Operations | Interakt (Indian BSP) | Built for India, INR billing, delivery dashboard, seamless vs. raw API |
| WhatsApp — Social/Marketing | ManyChat Pro (existing) | Already built, social media integrations active — retain as-is |
| Web Admin Portal | React.js + Node.js | Fast, scalable, strong developer availability in India |
| Database | PostgreSQL | Reliable, open-source, excellent for complex reporting |
| Gate Tablet App | Progressive Web App (PWA) | 4 gates — access control, zone management, Zone 3 upgrade payment
Annakshetra Canteen App | Progressive Web App (PWA) | Dedicated meal scanning, tap counter, dashboard, today's list |
| Hosting | AWS Mumbai or DigitalOcean Bangalore | Data stays in India, low latency, PDPA compliant, auto-scales |
| Payment Gateway | Razorpay | Indian provider, UPI + cards + WhatsApp Pay |
| SMS Fallback | MSG91 | Indian provider, OTP support |
| Reporting / Analytics | Built-in + Apache Superset (open source) | Custom dashboards, no licence cost |
| Café POS | Petpooja (existing at 2 cafés) | Already in use — Dhanvantari to migrate Phase 2 |

---

## 17. Budget & Implementation Roadmap

### Phase-Wise Implementation

#### Phase 1 — Quick Digital Start (Months 1–3)
**Cost: ₹5,000–₹20,000/month (uses existing ManyChat Pro)**
- Extend ManyChat with walk-in registration flow
- QR posters at Main Gate & Gate 7
- Contractor WhatsApp daily muster flow
- Google Form pre-registration (guests + labourers)
- Annakshetra WhatsApp daily headcount to Anand Prem P
- Google Sheet manual dashboard
- Train gate staff on QR basics

#### Phase 2 — Core Platform Build (Months 3–12)
**One-time: ₹15–22 Lakhs | Monthly running: ₹18,000–₹35,000**
- All 5 integrations (Greythr, ESSL, eZee, Interakt, Petpooja)
- Unified Person Identity database (16 types)
- QR gate control — all 4 zones · Gate Tablet App for 4 campus gates
- Contractor self-service portal + HOD approval workflow
- Annakshetra B/D token system + free meal tap counter
- All 14 WhatsApp flows (Interakt)
- Festival Mode (batch entry + 17 committee dashboards)
- Monthly police report auto-generation
- Vehicle management module
- RBAC — 5-layer role system + audit trail
- All 17 standard reports + management dashboard
- Ashram / VVSHCH fixed kitchen module

#### Phase 3 — Advanced Intelligence (Months 13–18)
**Additional: ₹4–10 Lakhs**
- Online paid day visit booking + Razorpay
- Dhanvantari Café on Petpooja POS
- Aadhaar eKYC for labourer verification
- C-Form auto-submission (police portal)
- Vehicle boom barrier at Main Gate
- Festival footfall AI prediction
- Kitchen inventory linked to meal forecast
- Custom report builder for management

### Monthly Running Costs (Post Phase 2 Launch)

| Item | Monthly Cost | Notes |
|---|---|---|
| Interakt (WhatsApp operations) | ₹3,000–₹6,000 | Plan + WhatsApp conversation fees |
| ManyChat Pro (existing) | ₹2,500–₹4,000 | Retain for social media flows |
| Server hosting (AWS/DigitalOcean, Mumbai) | ₹4,000–₹8,000 | Auto-scales on festival days |
| Developer AMC / support | ₹8,000–₹15,000 | Bug fixes, updates — include in contract |
| SSL, domain, misc. | ₹1,000–₹2,000 | Annual cost spread monthly |
| **Total estimated monthly** | **₹18,500–₹35,000** | |

---

## 18. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Availability | 99.5% uptime 24×7. Offline mode for gate tablets and Annakshetra counter (sync on reconnect). Zero downtime tolerance during festival peak hours. |
| Performance | QR scan to entry: <3 seconds. WhatsApp auto-response: <5 seconds. Dashboard load: <5 seconds. Festival batch counter: real-time, no lag. |
| Scalability | Must handle 20,000+ concurrent visitors on festival days without degradation. Auto-scale database and hosting. |
| Security (RBAC) | 5-layer role-based access. All ID proof images encrypted at rest. Every action logged in audit trail (immutable — never deleted). Auto-lock after 5 failed login attempts. PDPA / IT Act compliant. Data hosted in India only. |
| Language | WhatsApp flows: English + Hindi (Devanagari). Admin portal: English. Gate tablet: large text, simple icons for all literacy levels. |
| Data Retention | Active visitor data: 1 year. Police report data: 5 years (legal requirement). Audit trail: permanent. Archived profiles: retained indefinitely (deactivated, not deleted). |
| Compliance | Maharashtra lodging house regulations (C-Form). Labour law record-keeping (Aadhaar copy retention). PDPA for personal data. Monthly police report. |
| Backup | Daily automated database backup to separate cloud. Weekly backup test. Maximum data loss window: 24 hours. |

---

## 19. Open Questions — All Resolved

All 20 key questions have been answered through Q&A sessions with Ram Prabhu (April 2026):

- ✅ Booking system: eZee + MakeMyTrip, Goibibo OTA
- ✅ HRMS: Greythr with API integration
- ✅ Biometric: ESSL with API available for weekly labourer data
- ✅ WhatsApp: ManyChat Pro (existing) + Interakt (new for VMS ops)
- ✅ Annakshetra timings: Breakfast 7:15–8:15 AM · Dinner 6:30–7:15 PM
- ✅ Annakshetra B/D: Paid registered service — confirmed payment methods per category
- ✅ Free services: Lunch 12:45–2:30 PM + Khichadi 9:30 AM–12:30 PM and 4–7:30 PM
- ✅ Three paid cafés: Govinda's Srinathji Bhavan, Govinda's Guest Area, Dhanvantari Café
- ✅ Campus zones: 4 zones confirmed
- ✅ Brahmacharis: 55 residents, Madhav Prem P, separate kitchen
- ✅ Varishtha Vaishnavas: 19 residents, Achyuta Avtar P / Achyut Patil (same person), VVSHCH
- ✅ Police report: Monthly, Premanjan P, Legal under Devarshi Narad P
- ✅ Festival footfall: Janmashtami 15,000–20,000; New Year/holidays 10,000–12,000; other festivals 4,000–5,000
- ✅ Vehicle scale: Weekdays <100, Weekends 400–500, Festivals 1,000+
- ✅ Sustainability interns: 3–6 months, 15–20/year
- ✅ GAC structure: 16 members fully documented from official PPTX + Excel (24 Apr 2026)
- ✅ Sri Gaurcaran P (GAC 4) and Sri Gurucaran P (GAC 9) are two different people
- ✅ Govardhan Skill Centre: excluded from VMS scope
- ✅ GEMS = Govardhan English Medium School (separate from Skill Centre)
- ✅ IT: Ram Prabhu (Software, project coordinator) + Radhashyamsundar P (Infra)

---

## 20. Document Sign-Off

This is the complete, definitive requirements document compiled through detailed Q&A sessions with Ram Prabhu in April 2026, and updated with the official Organizational Structure (PPTX) and GAC Department Allocation (Excel) documents dated 24 April 2026.

| Name | Role | Review Date | Signature |
|---|---|---|---|
| Vasudev Prabhuji | Final Authority — GEV Project | | |
| Sri Gaurcaran Prabhuji | IT / HR Director (GAC 4) | | |
| Ram Prabhu | IT Software Head / Project Coordinator | | |
| Anand Prem Prabhu | Annakshetra Head Sevak | | |
| Premanjan Prabhu | Security In-charge | | |
| Anandnimai Prabhu | Construction HOD | | |
| Laxmanpran Prabhu | Maintenance Construction HOD | | |
| Balaji Govind Prabhu | Volunteer Coordinator | | |
| IT / Development Partner | Technical Lead (to be appointed) | | |

---

*🕉️ Hare Krishna. This is the complete definitive requirements document for the GEV Integrated Campus Management System.*

*Document Version 4.0 (Final) | April 2026 | Compiled from Q&A sessions + Official Organogram (24 Apr 2026)*

*Govardhan EcoVillage – ISKCON GEV | Galtare, Hamrapur, Wada, Palghar – 421303, Maharashtra*  
*Patron: HH Radhanath Swami | ecovillage.org.in | iskcongev.com*

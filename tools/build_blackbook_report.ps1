Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Builds a self-contained DOCX without external packages.  Content is drawn from
# the project source reports, then formatted to the supplied black-book rules.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out = Join-Path $root 'GOne_LifeLink_AI_Black_Book_Report.docx'
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('gone-report-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $temp | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp 'word') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temp 'word\_rels') | Out-Null

function Xml([string]$s) { [System.Security.SecurityElement]::Escape($s) }
$script:body = [System.Text.StringBuilder]::new()
function P([string]$text, [string]$style = 'Body', [switch]$PageBreak, [switch]$Center, [switch]$Code) {
  $ppr = ''
  if ($PageBreak) { $ppr += '<w:pageBreakBefore/>' }
  if ($Center) { $ppr += '<w:jc w:val="center"/>' }
  $rpr = if ($Code) {'<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="18"/></w:rPr>'} else {''}
  [void]$script:body.Append("<w:p><w:pPr><w:pStyle w:val=`"$style`"/>$ppr</w:pPr><w:r>$rpr<w:t xml:space=`"preserve`">$(Xml $text)</w:t></w:r></w:p>")
}
function PageBreak { [void]$script:body.Append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>') }
function Tbl([string[]]$cells) {
  [void]$script:body.Append('<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tr>')
  foreach($c in $cells) { [void]$script:body.Append("<w:tc><w:tcPr><w:tcW w:w=`"3000`" w:type=`"dxa`"/></w:tcPr><w:p><w:pPr><w:pStyle w:val=`"TableText`"/></w:pPr><w:r><w:t xml:space=`"preserve`">$(Xml $c)</w:t></w:r></w:p></w:tc>") }
  [void]$script:body.Append('</w:tr></w:tbl>')
}
function Add-Markdown([string]$path, [string]$label) {
  P $label 'Chapter' -PageBreak
  $insideCode=$false
  foreach($raw in Get-Content -LiteralPath $path -Encoding UTF8) {
    $line = $raw.TrimEnd()
    if($line -match '^```') { $insideCode = -not $insideCode; continue }
    if($insideCode) { if($line) { P $line 'Code' -Code }; continue }
    if($line -match '^# (.+)') { P $Matches[1] 'Title'; continue }
    if($line -match '^## (.+)') { P $Matches[1] 'Heading1' -PageBreak; continue }
    if($line -match '^### (.+)') { P $Matches[1] 'Heading2' -PageBreak; continue }
    if($line -match '^---+$') { continue }
    if($line -match '^>\s*(.+)') { P $Matches[1] 'Quote'; continue }
    if($line -match '^[-*] (.+)') { P ('• ' + $Matches[1]) 'Body'; continue }
    if($line -match '^\d+\. (.+)') { P $line 'Body'; continue }
    if($line -match '^\|(.+)\|$') {
      $parts = $Matches[1].Split('|') | ForEach-Object {$_.Trim()}
      if(-not ($parts -join '' -match '^-+$')) { Tbl $parts }; continue
    }
    if($line) { P ($line -replace '`','') 'Body' }
  }
}

# Preliminary pages. Names are intentionally left for the student/team to supply.
P 'GONE / LIFELINK AI+' 'CoverTitle' -Center
P 'AN AI-ENABLED EMERGENCY MEDICAL RESPONSE AND HOSPITAL COORDINATION PLATFORM' 'CoverSub' -Center
P 'Major Project Report' 'CoverSub' -Center
P 'Submitted in partial fulfilment of the requirements for the degree of Bachelor of Technology' 'CoverText' -Center
P 'Department: [INSERT DEPARTMENT]' 'CoverText' -Center
P 'Submitted by: [INSERT STUDENT NAME(S) AND PID]' 'CoverText' -Center
P 'Under the guidance of: [INSERT GUIDE NAME AND DESIGNATION]' 'CoverText' -Center
P 'St. John College of Engineering and Management, Palghar' 'CoverText' -Center
P 'Academic Year 2026–2027' 'CoverText' -Center
PageBreak
P 'CERTIFICATE' 'Chapter' -Center
P 'This is to certify that the project report entitled “GOne / LifeLink AI+: An AI-Enabled Emergency Medical Response and Hospital Coordination Platform” is a bona fide work carried out by [INSERT STUDENT NAME(S)] under the guidance of [INSERT GUIDE NAME]. The final personal, departmental and institutional details must be verified by the submitting team before printing.' 'Body'
P 'DECLARATION' 'Chapter' -PageBreak -Center
P 'We declare that this report is an original account of the work carried out for the stated project. Ideas and material obtained from other sources have been acknowledged in the references. The team will validate all names, signatures, dates and institutional fields before submission.' 'Body'
P 'ACKNOWLEDGEMENT' 'Chapter' -PageBreak -Center
P 'We express our gratitude to our project guide, department faculty, college administration, project teammates, test users and families for their guidance and support during the design, implementation and documentation of GOne / LifeLink AI+.' 'Body'
P 'ABSTRACT' 'Chapter' -PageBreak -Center
P 'GOne / LifeLink AI+ is a prototype emergency medical-response platform that connects a patient-facing mobile application, a FastAPI service layer, hospital operations and the G-ONE ResQ voice-assistance service. The system supports account access, emergency wallets, medical-record storage, SOS creation, emergency contact data, hospital discovery, operational updates and hospital-side emergency management. An orchestration path combines structured request data with a tiered AI-assistance design: configured providers can be used when available, while deterministic safety-oriented protocols remain available as a fallback. The mobile client is implemented with React Native, Expo Router, TypeScript and Zustand. The backend uses FastAPI, SQLAlchemy, Pydantic, JWT authentication and an ORM-managed data model, with PostgreSQL-oriented configuration and a local SQLite fallback. The companion hospital dashboard provides a hospital-specific view of allocated emergency cases, resource assignment and case progression. This report is an as-built technical and academic record prepared from the supplied repositories and supporting project documents. It distinguishes implemented prototype capabilities from future production work; it does not claim clinical diagnosis, verified dispatch navigation, live emergency-service integration or measured clinical outcomes.' 'Body'
P 'TABLE OF CONTENTS' 'Chapter' -PageBreak -Center
P 'The document is structured in seven academic chapters followed by detailed technical appendices. In Microsoft Word, right-click this page and select Update Field after opening the document to generate page-numbered contents automatically.' 'Body'
P 'LIST OF ABBREVIATIONS' 'Chapter' -PageBreak -Center
Tbl @('AI','Artificial Intelligence'); Tbl @('API','Application Programming Interface'); Tbl @('ASGI','Asynchronous Server Gateway Interface'); Tbl @('DFD','Data Flow Diagram'); Tbl @('JWT','JSON Web Token'); Tbl @('OCR','Optical Character Recognition'); Tbl @('ORM','Object-Relational Mapping'); Tbl @('SOS','Emergency distress request'); Tbl @('STT','Speech-to-Text'); Tbl @('UI','User Interface')

P 'CHAPTER 1 — INTRODUCTION' 'Chapter' -PageBreak
P 'GOne / LifeLink AI+ addresses the information-coordination gap that can arise when emergency data, medical context, patient communication and hospital action are distributed across separate tools. The project is a software prototype intended to make the emergency flow visible to the right actors through a mobile application, a service backend, a hospital operations view and an AI-assisted ResQ interaction.' 'Body'
P '1.1 Motivation' 'Heading1'
P 'In an emergency, a user may need to communicate personal details, symptoms, location and immediate needs while under stress. At the same time, a responding hospital needs a concise operational view of the request and its available resources. The project investigates how a single platform can preserve and route relevant information without representing the software as a substitute for clinicians, emergency operators or statutory services.' 'Body'
P '1.2 Problem Statement' 'Heading1' -PageBreak
P 'The problem addressed is the absence of a coherent prototype workflow spanning emergency initiation, emergency context, hospital-facing case handling and safe conversational support. Manual or disconnected processes can make context hand-off slow and inconsistent. The proposed platform centralizes the application-level record and exposes role-appropriate views while retaining explicit boundaries around clinical and dispatch decisions.' 'Body'
P '1.3 Objectives' 'Heading1' -PageBreak
Tbl @('Objective','Project objective'); Tbl @('O1','Provide a patient-facing mobile workflow for account, profile, emergency wallet, medical-record and SOS actions.'); Tbl @('O2','Provide authenticated REST APIs and persistence for users, hospitals, SOS records, contacts, wallet data and supporting entities.'); Tbl @('O3','Provide a hospital-side operational dashboard for allocated cases, resources and status updates.'); Tbl @('O4','Provide a voice-oriented ResQ service with safety validation, provider fallback and protocol-guided responses.'); Tbl @('O5','Document the as-built architecture, data model, tests, limitations and future roadmap accurately.')
P '1.4 Scope and Boundaries' 'Heading1' -PageBreak
P 'The scope is a software prototype and technical reference. The system includes project-defined emergency workflows, demonstration data, configurable integrations and source-based services. It does not claim ambulance dispatch authority, diagnosis, prescription, emergency-service integration, real-time traffic optimisation, regulatory certification, clinical validation or guaranteed availability. Those outcomes require governance, integration agreements, security review and real-world evaluation outside the supplied codebase.' 'Body'

P 'CHAPTER 2 — REVIEW OF LITERATURE' 'Chapter' -PageBreak
P 'The proposed work draws on four relevant areas: emergency information systems, healthcare operational dashboards, mobile health record access and safety-aware conversational AI. The following review is deliberately tied to the prototype’s design decisions instead of claiming direct validation from the cited work.' 'Body'
P '2.1 Healthcare Operational Dashboards' 'Heading1' -PageBreak
P 'Healthcare dashboards are commonly assessed through their support for specific information needs, interaction workflows and implementation context. The hospital module in this project follows that orientation by showing allocated emergencies, resources and progression states in one operational interface. Its value is demonstrated at workflow level rather than through a claim of measured clinical improvement.' 'Body'
P '2.2 Mapping and Route Context' 'Heading1' -PageBreak
P 'Leaflet and OpenStreetMap enable interactive browser map displays, while OSRM can provide route geometry when the service is available. In the hospital dashboard, this supports visual case context. It remains an operational aid only; the implementation does not claim verified ambulance navigation or traffic-aware routing.' 'Body'
P '2.3 AI Assistance in High-Stakes Contexts' 'Heading1' -PageBreak
P 'In high-stakes medical contexts, an AI interaction must not be treated as an autonomous clinical authority. G-ONE ResQ therefore applies provider fallback, constrained protocols and safety validation. The implementation documents these as software safeguards and not as proof of medical efficacy.' 'Body'
P '2.4 Comparative Positioning' 'Heading1' -PageBreak
Tbl @('Aspect','Conventional isolated tool','GOne / LifeLink AI+ prototype'); Tbl @('Patient emergency context','Often spread across calls/forms','Wallet, records, SOS and contact data represented in one app workflow'); Tbl @('Hospital view','May require separate queues and resource screens','Hospital dashboard presents allocated cases and resource actions'); Tbl @('Conversational support','Unconstrained chat can be unsafe','Tiered provider path plus deterministic protocols and validation'); Tbl @('Boundary','May be unclear to users','Report explicitly separates prototype assistance from clinical/dispatch authority')

# Source-derived report material. Each significant technical unit begins on a fresh page,
# yielding a print-ready 100+ page detailed technical volume rather than padded blank pages.
Add-Markdown (Join-Path $root 'final.md') 'CHAPTER 3 TO CHAPTER 6 — AS-BUILT TECHNICAL INVESTIGATION'
P 'APPENDIX A — SOURCE DOCUMENT CROSS-REFERENCE' 'Chapter' -PageBreak
P 'This report was compiled by reconciling the supplied GOne-main (2), G-ONE-ResQ-main and lifelink-hospital-dashboard-main source archives with the project documents FINAL.md, FULL_SYSTEM_REPORT.md, IMPLEMENTATION_PLAN.md, REPORT_APP.md, REPORT_ADMIN_DASHBOARD.md, README.md, My_Blackbook_Contribution.docx and LifeLink_AI_Backend_Individual_Contribution_Corrected.docx. Repeated material was consolidated into the main technical investigation rather than reproduced verbatim. The mobile application and hospital dashboard sections in this report preserve their implementation-specific findings, including their stated boundaries around mock data, routing and production integration.' 'Body'
Tbl @('Supplied source','How it is represented in this report'); Tbl @('GOne-main (2)','Primary application, API, data model, authentication, SOS and deployment coverage'); Tbl @('G-ONE-ResQ-main','Voice pipeline, safety validation, protocol registry, provider fallback and handover coverage'); Tbl @('lifelink-hospital-dashboard-main','Hospital workflow, resource management, mapping/routing and dashboard coverage'); Tbl @('College templates/guidelines','Formal chapter order, typography, captions, preliminary pages and reference treatment'); Tbl @('Individual contribution reports','Backend and dashboard requirements, boundaries and evidence reconciled into the relevant chapters')

P 'CHAPTER 7 — CONCLUSION AND FUTURE SCOPE' 'Chapter' -PageBreak
P 'The source repositories demonstrate an integrated emergency-response prototype with a patient mobile app, FastAPI backend, hospital operations module and G-ONE ResQ service. The implementation is strongest as a structured platform for collecting, persisting and presenting project-defined emergency information across roles. Its layered architecture, typed schemas, separation of services and provider fallback approach support continued iteration.' 'Body'
P 'Future work should prioritize verified production authentication and authorization, secure secret management, audit logging, consent design, encryption and retention policies, integration contracts with real hospitals and emergency services, accessibility testing, network resilience, formal clinical review of all safety content, monitoring, load testing and controlled user evaluation. Any live deployment must be governed by appropriate clinical, legal, privacy and operational stakeholders.' 'Body'
P 'REFERENCES' 'Chapter' -PageBreak
P 'Leaflet. “Leaflet: A JavaScript Library for Interactive Maps.” Leaflet, leafletjs.com/. Accessed 20 Oct. 2026.' 'Body'
P 'OpenStreetMap Contributors. “OpenStreetMap.” OpenStreetMap, www.openstreetmap.org/. Accessed 20 Oct. 2026.' 'Body'
P 'Project OSRM. “OSRM API Documentation.” Project OSRM, project-osrm.org/docs/. Accessed 20 Oct. 2026.' 'Body'
P 'Yoo, Jin, et al. “A Real-Time Autonomous Dashboard for the Emergency Department.” Journal of the American Medical Informatics Association, 2018.' 'Body'
P 'Zhuang, Mengdie, Dave Concannon, and Ed Manley. “A Framework for Evaluating Dashboards in Healthcare.” arXiv, 2020, arxiv.org/abs/2009.04792.' 'Body'
P 'Supplied project source archives: GOne-main (2), G-ONE-ResQ-main and lifelink-hospital-dashboard-main. Source reviewed October 2026.' 'Body'

$doc = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>$($script:body.ToString())<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/><w:footerReference w:type="default" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></w:sectPr></w:body></w:document>
"@
$styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Body"><w:name w:val="Body"/><w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto" w:after="120"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Chapter"><w:name w:val="Chapter"/><w:basedOn w:val="Body"/><w:rPr><w:b/><w:sz w:val="32"/><w:caps/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Body"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:pPr><w:spacing w:before="180" w:after="180"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Body"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Body"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Body"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:rPr><w:sz w:val="20"/></w:rPr><w:pPr><w:spacing w:line="300"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="CoverTitle"><w:name w:val="Cover Title"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:pPr><w:spacing w:before="2500" w:after="360"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="CoverSub"><w:name w:val="Cover Sub"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:pPr><w:spacing w:after="240"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="CoverText"><w:name w:val="Cover Text"/><w:rPr><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:after="180"/></w:pPr></w:style></w:styles>
"@
$footer = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>GOne / LifeLink AI+ — Project Report — </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>PAGE</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'
$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'
$rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships" Target="word/document.xml"/></Relationships>'
$docrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
[IO.File]::WriteAllText((Join-Path $temp '[Content_Types].xml'),$contentTypes,[Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $temp '_rels\.rels'),$rels,[Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $temp 'word\document.xml'),$doc,[Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $temp 'word\styles.xml'),$styles,[Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $temp 'word\footer1.xml'),$footer,[Text.Encoding]::UTF8)
[IO.File]::WriteAllText((Join-Path $temp 'word\_rels\document.xml.rels'),$docrels,[Text.Encoding]::UTF8)
if(Test-Path $out) { Remove-Item -LiteralPath $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
# ZipFile.CreateFromDirectory on Windows preserves backslashes in entry names;
# Office packages require forward-slash OPC part names, so write each part explicitly.
$archive = [System.IO.Compression.ZipFile]::Open($out,[System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -LiteralPath $temp -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($temp.Length + 1).Replace('\','/')
  $entry = $archive.CreateEntry($relative,[System.IO.Compression.CompressionLevel]::Optimal)
  $input = [IO.File]::OpenRead($_.FullName); $output = $entry.Open()
  $input.CopyTo($output); $output.Dispose(); $input.Dispose()
}
$archive.Dispose()
Remove-Item -LiteralPath $temp -Recurse -Force
Write-Output $out

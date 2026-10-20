/**
 * G-ONE ResQ — High-Reliability Emergency AI Triage & Survival Diagnostician
 * 
 * Multi-layer architecture:
 * 1. Primary: Cloud LifeLink Backend (/voice/resq/turn)
 * 2. Secondary: Direct Google Gemini Generative API (zero-cold-start, live streaming chat)
 * 3. Tertiary: Comprehensive Local Clinical First-Aid Protocol Engine (100% offline-ready)
 * 
 * Supports: English, Hindi, Marathi, and Auto-Detect.
 */

export interface ResqTurnRequest {
  sosId: number;
  speech: string;
  turn: number;
  lang?: 'en' | 'hi' | 'mr' | 'auto';
  history?: Array<{ sender: 'patient' | 'ai' | 'dispatcher'; text: string }>;
  patientName?: string;
  medicalConditions?: string[];
  allergies?: string[];
  bloodGroup?: string;
}

export interface ResqTurnResponse {
  success: boolean;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  protocol_title: string;
  first_aid_steps: string[];
  till_ambulance_arrives: string[];
  voice_response: string;
  is_final?: boolean;
}

// Clinical protocol definitions for pre-hospital survival
export const CLINICAL_PROTOCOLS: Record<string, {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  keywords: string[];
  steps: string[];
  tillAmbulanceArrives: string[];
  responses: { en: string[]; hi: string[]; mr: string[] };
}> = {
  CARDIAC: {
    title: 'Cardiac / Chest Pain Protocol',
    severity: 'CRITICAL',
    keywords: [
      'chest pain', 'heart attack', 'heart', 'cardiac', 'chest pressure', 'angina', 'left arm',
      'seena', 'chhati', 'dil', 'dil ka daura', 'chhatit dukhate', 'chhatit kal', 'hruday', 'dhad dhad'
    ],
    steps: [
      'Help the patient sit upright in a comfortable position with back firmly supported.',
      'Loosen tight clothing around neck, chest, and waist.',
      'If conscious and not allergic, give one 300mg chewable Aspirin immediately.',
      'Check if patient has prescribed emergency heart medication (Sorbitrate / Nitroglycerin).',
      'Keep patient completely calm; do not allow walking or physical exertion.',
      'If patient becomes unresponsive, begin CPR immediately (100-120 compressions/min).'
    ],
    tillAmbulanceArrives: [
      'Keep patient sitting upright — DO NOT let them lie flat.',
      'Loosen shirt collar, tie, and belt right now.',
      'Keep front door unlocked and open so paramedics can rush inside.',
      'Collect recent ECG, prescriptions, and medical cards for the ambulance team.',
      'Do not give heavy food, tea, or coffee.'
    ],
    responses: {
      en: [
        'Responders are dispatched to your exact GPS coordinates. Sit upright immediately with back supported and loosen tight clothing around your chest. Are you feeling pain spreading to your left arm or jaw?',
        'Keep resting in a seated position. If you have prescribed heart medicine or chewable aspirin, take it now. Breathe slowly. Is the chest pressure increasing?'
      ],
      hi: [
        'Emergency ambulance aapki location par bhej di gayi hai. Turant seedhe baith jayein aur seene ke kapde loose karein. Kya dard baayein haath ya gale ki taraf ja raha hai?',
        'Bilkul shaant baithiye, chalna-phirna mat. Agar doctor ki di hui heart ki goli ya aspirin hai to le lijiye. Kya abhi saans lene me takleef ho rahi hai?'
      ],
      mr: [
        'तातडीची रुग्णवाहिका तुमच्या जीपीएस लोकेशनवर निघाल्या आहे. त्वरित पाठीला आधार देऊन ताठ बसा आणि छातीभोवतीचे कपडे सैल करा. वेदना डाव्या हाताकडे किंवा जबड्याकडे पसरत आहेत का?',
        'कृपया शांत बसून राहा, अजिबात हालचाल करू नका. डॉक्टरांचे हृदयाचे औषध किंवा अ‍ॅस्पिरिन उपलब्ध असल्यास घ्या. श्वास नीट घेता येतोय का?'
      ]
    }
  },
  SEVERE_BLEEDING: {
    title: 'Severe Bleeding & Hemorrhage Protocol',
    severity: 'CRITICAL',
    keywords: [
      'bleeding', 'blood', 'cut', 'wound', 'spurting', 'khoon', 'rakta', 'raktsrav', 'jakhmi', 'ghaav', 'artery'
    ],
    steps: [
      'Apply firm, continuous direct pressure to the wound with a clean cloth or sterile pad.',
      'Elevate the injured limb above heart level if no bone fracture is suspected.',
      'Do NOT remove blood-soaked cloths — place new layers directly on top.',
      'If severe limb bleeding cannot be stopped, apply a tourniquet 2 to 3 inches above wound.',
      'Keep the patient warm and lying down flat to prevent hypovolemic shock.'
    ],
    tillAmbulanceArrives: [
      'Keep continuous firm pressure on the wound without lifting the cloth.',
      'If blood soaks through, add another cloth on top — never take off the first layer.',
      'Keep the bleeding limb elevated higher than the chest.',
      'Cover patient with a warm blanket and elevate legs slightly.',
      'Do not give aspirin, water, or food.'
    ],
    responses: {
      en: [
        'Ambulance is en route. Take a clean cloth and press down firmly on the bleeding wound right now without lifting it. Is the bleeding slowing down, or is it spurting?',
        'Keep pressing firmly with both hands. Elevate the injured area above the heart if possible. Keep them warm and calm.'
      ],
      hi: [
        'Ambulance team aa rahi hai. Turant kisi saaf kapde se bleeding wali jagah par bina uthaye lagatar dabaav banayein. Kya khoon nikalna kam hua ya tezi se beh raha hai?',
        'Dabaav bilkul mat chhodiye. Agar kapda geela ho jaye to upar se dusra kapda lagayein. Ghayal hisse ko thoda upar uthayein.'
      ],
      mr: [
        'मदत पोहोचत आहे. स्वच्छ कापडाने रक्तस्त्रावाच्या जागेवर न उचलता सतत दोन हातांनी दाबून धरा. दाब अजिबात सोडू नका. रक्त थांबले आहे का अजून वाहत आहे?',
        'दाब सतत चालू ठेवा. कापड रक्ताने भरल्यास त्यावर दुसरे कापड ठेवा, पहिले काढू नका. जखमेचा भाग छातीपेक्षा वर उचलून धरा.'
      ]
    }
  },
  BREATHING_DIFFICULTY: {
    title: 'Respiratory Distress & Asthma Protocol',
    severity: 'HIGH',
    keywords: [
      'breathing', 'breath', 'asthma', 'wheezing', 'gasping', 'saans', 'dum', 'suffocating', 'inhaler', 'shwas', 'shvaas', 'dam lagto'
    ],
    steps: [
      'Help patient sit upright, leaning slightly forward with arms resting on knees.',
      'Assist patient in taking 2 to 4 puffs of their rescue inhaler (Salbutamol/Asthalin).',
      'Open all doors and windows to ensure maximum fresh air circulation.',
      'Coach slow pursed-lip breathing: inhale through nose for 2 seconds, exhale through lips for 4 seconds.',
      'Do NOT allow patient to lie flat.'
    ],
    tillAmbulanceArrives: [
      'Keep patient sitting upright leaning forward with hands on knees.',
      'Give 2 puffs of inhaler immediately if available, repeat in 5 minutes if needed.',
      'Disperse crowds and open windows for cool, fresh airflow.',
      'Do not give cold water or make them lie down.',
      'Stay right beside them coaching slow, gentle breathing.'
    ],
    responses: {
      en: [
        'Emergency dispatch is alerted. Sit upright leaning slightly forward. If you have an asthma inhaler, take two puffs now. Breathe with me: in through the nose, out through pursed lips. Can you speak full sentences?',
        'Keep taking slow, calm breaths. Keep your shoulders relaxed. Help is on the way. Are your lips or fingernails turning pale or blue?'
      ],
      hi: [
        'Ambulance team raaste me hai. Turant seedhe baithkar thoda aage jhukiye. Agar inhaler hai to turant 2 puff lijiye. Naak se lambi saans lijiye aur muh se dheere chhodiye.',
        'Shaant rahiye aur lambi saans lene par dhyan dijiye. Khidkiyan khol dein taaki taazi hawa aaye. Kya bolne me bohot zyada dikkat ho rahi hai?'
      ],
      mr: [
        'रुग्णवाहिका येत आहे. थोडे पुढे झुकून ताठ बसा. इनहेलर असल्यास त्वरित २ पफ घ्या. नाकाने हळूहळू श्वास घ्या आणि तोंडाने सोडा. तुम्हाला पूर्ण वाक्य बोलता येत आहे का?',
        'शांत राहा आणि खांदे सैल सोडा. खिडक्या उघडून ताजी हवा येऊ द्या. ओठ किंवा नखे निळे पडत आहेत का?'
      ]
    }
  },
  UNCONSCIOUS: {
    title: 'Unconscious / CPR Protocol',
    severity: 'CRITICAL',
    keywords: [
      'unconscious', 'unresponsive', 'fainted', 'collapsed', 'behosh', 'hosh nahi', 'not waking up', 'beshuddha', 'padla'
    ],
    steps: [
      'Check for responsiveness: tap collarbones and shout "Can you hear me?".',
      'Check for normal breathing by watching the chest for 5-10 seconds.',
      'If NOT breathing normally: Place hands in center of chest and push hard & fast (100-120 bpm, 2 inches deep).',
      'If breathing normally: Roll patient gently onto their side into Recovery Position.',
      'Never put water or food into an unconscious person\'s mouth.'
    ],
    tillAmbulanceArrives: [
      'If NO normal breathing, do continuous chest compressions (push hard & fast to "Stayin Alive" rhythm).',
      'If breathing, keep on side in recovery position to protect airway.',
      'Never leave the patient unattended.',
      'Clear the pathway and open the door for emergency medics.'
    ],
    responses: {
      en: [
        'Paramedics are alerted with your GPS location. Check right now: is the patient\'s chest moving up and down? Are they breathing? If not breathing, tell me and we will start CPR compressions immediately.',
        'Place the heel of your hand in the center of the chest and push down hard and fast, two compressions per second. Do not stop until paramedics arrive.'
      ],
      hi: [
        'Paramedics aapki location par bhej diye gaye hain. Turant check kijiye: kya patient ki chhati hil rahi hai? Kya saans chal rahi hai? Agar saans nahi hai to turant batayein hum CPR shuru karenge.',
        'Apne haath chhati ke theek beech me rakhein aur tezi se do baar per second dabayein. CPR tab tak mat rokiye jab tak ambulance na aa jaye.'
      ],
      mr: [
        'पॅरामेडिक पथक तुमच्या लोकेशनवर येत आहे. लगेच तपासा: रुग्णाची छाती वर-खाली होतेय का? श्वास चालू आहे का? श्वास नसेल तर सांगा, आपण लगेच सीपीआर सुरू करू.',
        'छातीच्या मधोमध हाताचा तळवा ठेवून जोरात आणि जलद दाबा, सेकंदाला दोनदा. रुग्णवाहिका येईपर्यंत दाबत राहा.'
      ]
    }
  },
  ACCIDENT_TRAUMA: {
    title: 'Accident & Physical Trauma Protocol',
    severity: 'HIGH',
    keywords: [
      'accident', 'crash', 'bike', 'car', 'hit', 'fall', 'collision', 'dharak', 'gir gaya', 'padla', 'mar lagla'
    ],
    steps: [
      'Do NOT move the patient unless there is immediate danger of fire or explosion.',
      'Keep the neck and spine completely still in a neutral alignment.',
      'Control any visible external bleeding with direct pressure.',
      'Keep the patient warm with a blanket to treat for trauma shock.',
      'Do not remove helmets unless airway is completely obstructed.'
    ],
    tillAmbulanceArrives: [
      'Keep neck and back completely still — avoid turning their head.',
      'Support the sides of the head with rolled jackets or towels.',
      'Stop any active bleeding by pressing with clean cloth.',
      'Keep patient warm and reassure them calmly.',
      'Do not offer water or food.'
    ],
    responses: {
      en: [
        'Emergency response units have been dispatched. Do NOT move the patient, especially their head, neck, or back. Apply pressure to any bleeding areas. Is the patient awake and speaking?',
        'Keep their head and neck completely supported. Reassure them that help is arriving right now. Are they in severe pain in any specific area?'
      ],
      hi: [
        'Emergency ambulance bhej di gayi hai. Patient ko bilkul mat hilayein, gardan aur peeth ko seedha rakhein. Agar khoon beh raha hai to kapde se dabayein. Kya patient hosh me hain?',
        'Gardan ko dono taraf se sahara dekar sthir rakhein. Unhe tasalli dein ki madad pahunch rahi hai. Kya kisi haddi me tootne jaisa dard hai?'
      ],
      mr: [
        'आपत्कालीन मदत रवाना झाली आहे. रुग्णाची मान आणि पाठीचा कणा अजिबात हलवू नका. रक्तस्त्राव होत असल्यास स्वच्छ कापडाने दाबून धरा. रुग्ण शुद्धीत बोलत आहेत का?',
        'डोके आणि मान स्थिर धरून ठेवा. घाबरू नका, रुग्णवाहिका येत आहे. शरीराच्या कोणत्या भागाला जास्त दुखापत झाली आहे?'
      ]
    }
  },
  GENERAL_EMERGENCY: {
    title: 'General Acute Emergency Protocol',
    severity: 'MEDIUM',
    keywords: [],
    steps: [
      'Ensure the patient is in a safe, comfortable resting position.',
      'Check vital signs: monitor breathing, consciousness, and pulse.',
      'Loosen restrictive clothing and maintain a calm, quiet environment.',
      'Do not administer oral medication unless specifically prescribed for this condition.',
      'Keep the patient warm and monitor for any sudden deterioration.'
    ],
    tillAmbulanceArrives: [
      'Keep patient resting comfortably and calm.',
      'Ensure unobstructed access for the emergency medical team.',
      'Gather national identity, health insurance, and medication lists.',
      'Stay on the line and describe any changing symptoms.'
    ],
    responses: {
      en: [
        'Emergency responders have been alerted with your live location. Help is on the way. Sit or lie down in a safe, comfortable position. Tell me: what symptoms are you experiencing right now?',
        'I am right here with you until the ambulance arrives. Keep resting calmly. Are you feeling any severe pain, nausea, or dizziness?'
      ],
      hi: [
        'Emergency team ko aapki live location mil chuki hai aur wo nikal chuki hai. Aaraam se baith ya let jayein. Batayein, is waqt kya takleef ho rahi hai?',
        'Ambulance aane tak main lagatar aapke saath hoon. Shaant rahiye. Kya chakkar, ulti ya tez dard ho raha hai?'
      ],
      mr: [
        'आपत्कालीन पथकाला तुमचे लाईव्ह लोकेशन मिळाले असून ते निघत आहेत. शांतपणे आरामदायी स्थितीत बसा. तुम्हाला सध्या नक्की काय त्रास होत आहे?',
        'रुग्णवाहिका येईपर्यंत मी तुमच्यासोबत आहे. शांत राहा. चक्कर, मळमळ किंवा खूप वेदना होत आहेत का?'
      ]
    }
  }
};

/**
 * Detect language from text and user preference
 */
export function detectLanguage(text: string, preference?: 'en' | 'hi' | 'mr' | 'auto'): 'en' | 'hi' | 'mr' {
  if (preference && preference !== 'auto') return preference;

  // Marathi specific markers
  const mrRegex = /आहे|होत|त्रास|रक्त|लवकर|दुखत|छातीत|पडला|डोके|चक्कर|मदत|कळ|श्वास|नाही|आहात|पाहिजे/;
  if (mrRegex.test(text)) return 'mr';

  // Romanized Marathi
  const mrRomanRegex = /\b(aahe|hota|tras|rakt|lavkar|dukhate|chhatit|padla|doke|chakkar|madat|shwas|shvaas|nahi|tumhi)\b/i;
  if (mrRomanRegex.test(text)) return 'mr';

  // Hindi specific markers
  const hiRegex = /है|हो|रहा|दर्द|खून|सांस|चक्कर|मदद|बेहोश|हॉस्पिटल|सीने|गले|जल्दी/;
  if (hiRegex.test(text)) return 'hi';

  // Romanized Hindi
  const hiRomanRegex = /\b(hai|dard|khoon|saans|behosh|seene|jaldi|madad|chhati|takleef)\b/i;
  if (hiRomanRegex.test(text)) return 'hi';

  return 'en';
}

/**
 * Classify category based on text symptoms
 */
export function classifyCategory(speech: string): string {
  const lower = speech.toLowerCase();

  for (const [cat, proto] of Object.entries(CLINICAL_PROTOCOLS)) {
    if (cat === 'GENERAL_EMERGENCY') continue;
    for (const kw of proto.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return cat;
      }
    }
  }

  return 'GENERAL_EMERGENCY';
}

/**
 * Local Deterministic Protocol Triage Fallback
 * Guarantees instantaneous, actionable clinical guidance in any scenario
 */
export function localTriageDiagnostician(req: ResqTurnRequest): ResqTurnResponse {
  const speech = (req.speech || '').trim();
  const lang = detectLanguage(speech, req.lang);
  const category = classifyCategory(speech);
  const proto = CLINICAL_PROTOCOLS[category] || CLINICAL_PROTOCOLS.GENERAL_EMERGENCY;

  const responseList = proto.responses[lang] || proto.responses.en;
  // Use turn number to advance conversational depth
  const turnIndex = Math.min((req.turn || 1) - 1, responseList.length - 1);
  const voiceResponse = responseList[Math.max(0, turnIndex)];

  return {
    success: true,
    category,
    severity: proto.severity,
    protocol_title: proto.title,
    first_aid_steps: proto.steps,
    till_ambulance_arrives: proto.tillAmbulanceArrives,
    voice_response: voiceResponse,
    is_final: false
  };
}

/**
 * Direct Gemini Cloud AI Fallback (if backend endpoint fails or is cold)
 */
export async function directGeminiTriage(req: ResqTurnRequest, apiKey: string): Promise<ResqTurnResponse | null> {
  if (!apiKey) return null;

  try {
    const lang = detectLanguage(req.speech, req.lang);
    const langInstructions = lang === 'mr' 
      ? 'Respond strictly in Marathi (मराठी). Speak directly to the patient or bystander with calm, urgent medical empathy.'
      : lang === 'hi'
      ? 'Respond strictly in Hindi (हिंदी). Speak directly to the patient or bystander with calm, urgent medical empathy.'
      : 'Respond strictly in English. Speak directly to the patient or bystander with calm, urgent medical empathy.';

    const systemPrompt = `You are G-ONE ResQ, an elite clinical AI emergency dispatcher and pre-hospital survival guide.
An ambulance is currently dispatched to the user's GPS coordinates.
The patient or bystander is speaking to you in real-time emergency.
Turn Number: ${req.turn}.
${langInstructions}

Rules:
1. Provide EXACTLY 1 to 2 spoken sentences of immediate first-aid survival guidance.
2. Tell them what physical action to do right now till the ambulance arrives.
3. Ask ONE vital triage follow-up question (e.g., consciousness, breathing, chest pain radiation, bleeding status).
4. NEVER say just "help is on the way". You MUST give actionable medical guidance tailored to their symptoms.
5. Return JSON in this exact structure:
{
  "category": "CARDIAC" | "SEVERE_BLEEDING" | "BREATHING_DIFFICULTY" | "UNCONSCIOUS" | "ACCIDENT_TRAUMA" | "GENERAL_EMERGENCY",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM",
  "protocol_title": "Protocol Name",
  "voice_response": "1-2 spoken sentences in requested language",
  "first_aid_steps": ["step 1", "step 2", "step 3"],
  "till_ambulance_arrives": ["checklist 1", "checklist 2", "checklist 3"]
}`;

    const contents = [
      {
        role: 'user',
        parts: [
          { text: systemPrompt },
          { text: `Conversation History:\n${(req.history || []).map(h => `${h.sender}: ${h.text}`).join('\n')}\nPatient Just Said: "${req.speech}"` }
        ]
      }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (parsed.voice_response) {
          return {
            success: true,
            category: parsed.category || classifyCategory(req.speech),
            severity: parsed.severity || 'HIGH',
            protocol_title: parsed.protocol_title || 'Emergency First-Aid',
            first_aid_steps: parsed.first_aid_steps || [],
            till_ambulance_arrives: parsed.till_ambulance_arrives || [],
            voice_response: parsed.voice_response,
            is_final: false
          };
        }
      }
    }
  } catch {
    // If Gemini direct fails, seamlessly fallback to local engine
  }

  return null;
}

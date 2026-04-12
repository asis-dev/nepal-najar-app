/**
 * Nepal Republic — Document Intelligence Module (Phase 3)
 *
 * Classifies uploaded documents (citizenship, passport, license, etc.),
 * extracts structured fields via OpenAI Vision, suggests profile updates,
 * and maps documents to the service workflows they unlock.
 *
 * Falls back gracefully when AI APIs are unavailable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentType =
  | 'citizenship'
  | 'passport'
  | 'drivers_license'
  | 'pan_card'
  | 'national_id'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'utility_bill'
  | 'hospital_ticket'
  | 'bank_statement'
  | 'academic_certificate'
  | 'recommendation_letter'
  | 'photo'
  | 'unknown';

export interface ExtractedField {
  key: string;
  value: string;
  confidence: number; // 0-1
  profileKey?: string; // maps to CitizenProfile field
}

export interface DocumentClassification {
  documentType: DocumentType;
  confidence: number;
  alternateType?: DocumentType;
}

export interface ExtractionResult {
  classification: DocumentClassification;
  fields: ExtractedField[];
  rawText?: string;
  suggestedProfileUpdates: Record<string, string>;
  suggestedWorkflows: string[]; // service slugs this doc unlocks
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Field schemas per document type
// ---------------------------------------------------------------------------

export const DOCUMENT_FIELD_SCHEMAS: Record<
  DocumentType,
  Array<{ key: string; label: string; profileKey?: string }>
> = {
  citizenship: [
    { key: 'full_name_en', label: 'Full Name (English)', profileKey: 'full_name_en' },
    { key: 'full_name_ne', label: 'Full Name (Nepali)', profileKey: 'full_name_ne' },
    { key: 'citizenship_no', label: 'Citizenship Number', profileKey: 'citizenship_no' },
    { key: 'date_of_birth', label: 'Date of Birth', profileKey: 'date_of_birth' },
    { key: 'gender', label: 'Gender', profileKey: 'gender' },
    { key: 'father_name', label: "Father's Name", profileKey: 'father_name_en' },
    { key: 'mother_name', label: "Mother's Name", profileKey: 'mother_name_en' },
    { key: 'permanent_address', label: 'Permanent Address' },
    { key: 'issue_date', label: 'Issue Date', profileKey: 'citizenship_issue_date' },
    { key: 'issue_district', label: 'Issue District', profileKey: 'citizenship_issue_district' },
  ],
  passport: [
    { key: 'full_name_en', label: 'Full Name', profileKey: 'full_name_en' },
    { key: 'passport_no', label: 'Passport Number', profileKey: 'passport_no' },
    { key: 'date_of_birth', label: 'Date of Birth', profileKey: 'date_of_birth' },
    { key: 'gender', label: 'Gender', profileKey: 'gender' },
    { key: 'nationality', label: 'Nationality', profileKey: 'nationality' },
    { key: 'issue_date', label: 'Issue Date', profileKey: 'passport_issue_date' },
    { key: 'expiry_date', label: 'Expiry Date', profileKey: 'passport_expiry_date' },
    { key: 'place_of_birth', label: 'Place of Birth' },
  ],
  drivers_license: [
    { key: 'full_name_en', label: 'Full Name', profileKey: 'full_name_en' },
    { key: 'license_no', label: 'License Number', profileKey: 'license_no' },
    { key: 'date_of_birth', label: 'Date of Birth', profileKey: 'date_of_birth' },
    { key: 'category', label: 'License Category', profileKey: 'license_category' },
    { key: 'blood_group', label: 'Blood Group', profileKey: 'blood_group' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
  ],
  pan_card: [
    { key: 'full_name_en', label: 'Name', profileKey: 'full_name_en' },
    { key: 'pan_no', label: 'PAN Number', profileKey: 'pan_no' },
  ],
  national_id: [
    { key: 'full_name_en', label: 'Name', profileKey: 'full_name_en' },
    { key: 'national_id', label: 'National ID Number', profileKey: 'national_id' },
    { key: 'date_of_birth', label: 'Date of Birth', profileKey: 'date_of_birth' },
  ],
  birth_certificate: [
    { key: 'child_name', label: 'Child Name' },
    { key: 'date_of_birth', label: 'Date of Birth', profileKey: 'date_of_birth' },
    { key: 'father_name', label: "Father's Name", profileKey: 'father_name_en' },
    { key: 'mother_name', label: "Mother's Name", profileKey: 'mother_name_en' },
  ],
  marriage_certificate: [
    { key: 'spouse_name', label: 'Spouse Name', profileKey: 'spouse_name_en' },
    { key: 'marriage_date', label: 'Marriage Date' },
  ],
  utility_bill: [
    { key: 'customer_id', label: 'Customer/Account ID' },
    { key: 'customer_name', label: 'Customer Name', profileKey: 'full_name_en' },
    { key: 'amount_due', label: 'Amount Due' },
    { key: 'service_address', label: 'Service Address' },
  ],
  hospital_ticket: [
    { key: 'patient_name', label: 'Patient Name', profileKey: 'full_name_en' },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'department', label: 'Department' },
    { key: 'ticket_no', label: 'Ticket Number' },
  ],
  bank_statement: [],
  academic_certificate: [],
  recommendation_letter: [],
  photo: [],
  unknown: [],
};

// ---------------------------------------------------------------------------
// Document type -> workflow mapping
// ---------------------------------------------------------------------------

const WORKFLOW_MAP: Partial<Record<DocumentType, string[]>> = {
  citizenship: ['new-passport', 'drivers-license-renewal', 'pan-registration'],
  passport: ['passport-renewal'],
  drivers_license: ['drivers-license-renewal', 'vehicle-registration'],
  pan_card: ['tax-clearance', 'business-registration'],
  national_id: ['sim-registration', 'bank-account-opening'],
  birth_certificate: ['citizenship-application', 'school-enrollment'],
  marriage_certificate: ['spouse-visa', 'joint-property-registration'],
  utility_bill: ['nea-bill-payment', 'kukl-bill-payment'],
  hospital_ticket: ['health-insurance-claim'],
  bank_statement: ['loan-application', 'visa-application'],
  academic_certificate: ['further-study-application', 'government-job-application'],
  recommendation_letter: ['citizenship-application', 'passport-renewal'],
};

// ---------------------------------------------------------------------------
// Filename keyword hints for classification
// ---------------------------------------------------------------------------

const FILENAME_HINTS: Array<{ pattern: RegExp; type: DocumentType }> = [
  { pattern: /citizen/i, type: 'citizenship' },
  { pattern: /nagarikta/i, type: 'citizenship' },
  { pattern: /passport/i, type: 'passport' },
  { pattern: /rahdani/i, type: 'passport' },
  { pattern: /licen[sc]e/i, type: 'drivers_license' },
  { pattern: /sawari/i, type: 'drivers_license' },
  { pattern: /pan[-_\s]?card/i, type: 'pan_card' },
  { pattern: /national[-_\s]?id/i, type: 'national_id' },
  { pattern: /birth[-_\s]?cert/i, type: 'birth_certificate' },
  { pattern: /janma[-_\s]?dart/i, type: 'birth_certificate' },
  { pattern: /marriage[-_\s]?cert/i, type: 'marriage_certificate' },
  { pattern: /vivah/i, type: 'marriage_certificate' },
  { pattern: /utility[-_\s]?bill/i, type: 'utility_bill' },
  { pattern: /electric|nea|kukl|water/i, type: 'utility_bill' },
  { pattern: /hospital|opd|ticket/i, type: 'hospital_ticket' },
  { pattern: /bank[-_\s]?statement/i, type: 'bank_statement' },
  { pattern: /academic|transcript|marksheet|certificate/i, type: 'academic_certificate' },
  { pattern: /recommend/i, type: 'recommendation_letter' },
  { pattern: /photo|selfie|headshot/i, type: 'photo' },
];

// ---------------------------------------------------------------------------
// Text keyword hints for classification
// ---------------------------------------------------------------------------

const TEXT_KEYWORDS: Array<{ keywords: string[]; type: DocumentType }> = [
  { keywords: ['nagarikta', 'citizenship', 'नागरिकता'], type: 'citizenship' },
  { keywords: ['passport', 'राहदानी', 'machine readable'], type: 'passport' },
  { keywords: ['driving license', 'sawari', 'सवारी चालक'], type: 'drivers_license' },
  { keywords: ['pan number', 'permanent account number', 'स्थायी लेखा'], type: 'pan_card' },
  { keywords: ['national identity', 'राष्ट्रिय परिचय'], type: 'national_id' },
  { keywords: ['birth certificate', 'जन्म दर्ता'], type: 'birth_certificate' },
  { keywords: ['marriage certificate', 'विवाह दर्ता'], type: 'marriage_certificate' },
  { keywords: ['electricity', 'water bill', 'nepal electricity'], type: 'utility_bill' },
  { keywords: ['opd', 'hospital', 'patient', 'department'], type: 'hospital_ticket' },
  { keywords: ['account statement', 'bank statement', 'transaction'], type: 'bank_statement' },
  { keywords: ['marksheet', 'transcript', 'grade sheet', 'academic'], type: 'academic_certificate' },
  { keywords: ['recommendation', 'सिफारिस'], type: 'recommendation_letter' },
];

// ---------------------------------------------------------------------------
// OpenAI Vision helper
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function callVisionAI(imageBase64: string, prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) return '';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

async function callTextAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) return '';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Safe JSON parse from AI response
// ---------------------------------------------------------------------------

function parseJsonFromAI(raw: string): Record<string, any> | null {
  try {
    // Try direct parse
    return JSON.parse(raw);
  } catch {
    // Try extracting from markdown code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// classifyDocument
// ---------------------------------------------------------------------------

export async function classifyDocument(input: {
  imageBase64?: string;
  text?: string;
  fileName?: string;
  mimeType?: string;
}): Promise<DocumentClassification> {
  const { imageBase64, text, fileName, mimeType } = input;

  // 1. Filename hint — fast path
  if (fileName) {
    for (const hint of FILENAME_HINTS) {
      if (hint.pattern.test(fileName)) {
        return { documentType: hint.type, confidence: 0.75 };
      }
    }
  }

  // 2. If image is provided, use Vision AI
  if (imageBase64) {
    const VALID_TYPES = Object.keys(DOCUMENT_FIELD_SCHEMAS).join(', ');
    const prompt = `You are a Nepali document classifier. Identify the type of this document image.
Return ONLY a JSON object with these fields:
- "documentType": one of [${VALID_TYPES}]
- "confidence": a number 0-1 indicating your confidence
- "alternateType": (optional) second most likely type if confidence < 0.8

Common Nepali documents: citizenship (nagarikta praman patra), passport (rahdani), drivers license (sawari chalak anumati patra), PAN card, birth certificate (janma darta), marriage certificate (vivah darta).`;

    const aiResponse = await callVisionAI(imageBase64, prompt);
    const parsed = parseJsonFromAI(aiResponse);

    if (parsed && parsed.documentType && parsed.documentType in DOCUMENT_FIELD_SCHEMAS) {
      return {
        documentType: parsed.documentType as DocumentType,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        alternateType:
          parsed.alternateType && parsed.alternateType in DOCUMENT_FIELD_SCHEMAS
            ? (parsed.alternateType as DocumentType)
            : undefined,
      };
    }
  }

  // 3. Text keyword matching
  if (text) {
    const lowerText = text.toLowerCase();
    let bestMatch: DocumentType = 'unknown';
    let bestScore = 0;

    for (const entry of TEXT_KEYWORDS) {
      const hitCount = entry.keywords.filter((kw) => lowerText.includes(kw.toLowerCase())).length;
      const score = hitCount / entry.keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry.type;
      }
    }

    if (bestScore > 0) {
      return {
        documentType: bestMatch,
        confidence: Math.min(0.9, 0.4 + bestScore * 0.5),
      };
    }
  }

  // 4. MIME-type based photo detection
  if (mimeType?.startsWith('image/') && !imageBase64 && !text) {
    return { documentType: 'photo', confidence: 0.3 };
  }

  return { documentType: 'unknown', confidence: 0.1 };
}

// ---------------------------------------------------------------------------
// extractFields
// ---------------------------------------------------------------------------

export async function extractFields(input: {
  documentType: DocumentType;
  imageBase64?: string;
  text?: string;
}): Promise<ExtractedField[]> {
  const { documentType, imageBase64, text } = input;
  const schema = DOCUMENT_FIELD_SCHEMAS[documentType];

  if (!schema || schema.length === 0) {
    return [];
  }

  const fieldDescriptions = schema
    .map((f) => `- "${f.key}": ${f.label}`)
    .join('\n');

  const prompt = `You are extracting structured data from a Nepali ${documentType.replace(/_/g, ' ')} document.

Extract ONLY these fields:
${fieldDescriptions}

Return a JSON object where keys are the field keys above and values are the extracted text.
If a field is not visible or unreadable, omit it from the result.
For dates, use YYYY-MM-DD format when possible. For Nepali BS dates, include as-is with "(BS)" suffix.
Return ONLY the JSON object, no explanation.`;

  let rawResponse = '';

  if (imageBase64) {
    rawResponse = await callVisionAI(imageBase64, prompt);
  } else if (text) {
    rawResponse = await callTextAI(`${prompt}\n\nDocument text:\n${text}`);
  }

  const parsed = parseJsonFromAI(rawResponse);

  if (!parsed) {
    // Return empty fields with zero confidence if AI extraction failed
    return schema.map((f) => ({
      key: f.key,
      value: '',
      confidence: 0,
      profileKey: f.profileKey,
    }));
  }

  return schema.map((f) => {
    const value = parsed[f.key];
    return {
      key: f.key,
      value: typeof value === 'string' ? value.trim() : value != null ? String(value) : '',
      confidence: value != null && value !== '' ? 0.8 : 0,
      profileKey: f.profileKey,
    };
  });
}

// ---------------------------------------------------------------------------
// validateExtraction
// ---------------------------------------------------------------------------

export function validateExtraction(
  documentType: DocumentType,
  fields: ExtractedField[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  // Date format validation
  const dateFields = ['date_of_birth', 'issue_date', 'expiry_date', 'marriage_date'];
  for (const key of dateFields) {
    const field = fieldMap.get(key);
    if (field && field.value) {
      // Accept YYYY-MM-DD, DD/MM/YYYY, or BS dates with "(BS)" suffix
      const isIso = /^\d{4}-\d{2}-\d{2}$/.test(field.value);
      const isDmy = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(field.value);
      const isBs = /\(BS\)/.test(field.value);
      if (!isIso && !isDmy && !isBs) {
        issues.push(`${key}: unrecognized date format "${field.value}"`);
      }
    }
  }

  // Document-specific validations
  if (documentType === 'citizenship') {
    const citizenshipNo = fieldMap.get('citizenship_no');
    if (citizenshipNo && citizenshipNo.value) {
      // Citizenship numbers are typically numeric, possibly with hyphens or slashes
      if (!/^[\d\-\/]+$/.test(citizenshipNo.value)) {
        issues.push(`citizenship_no: expected numeric value, got "${citizenshipNo.value}"`);
      }
    }
  }

  if (documentType === 'passport') {
    const passportNo = fieldMap.get('passport_no');
    if (passportNo && passportNo.value) {
      // Nepali passports: typically 2 letters + 7 digits (e.g., PA1234567)
      if (!/^[A-Z]{1,2}\d{6,8}$/i.test(passportNo.value.replace(/\s/g, ''))) {
        issues.push(`passport_no: unexpected format "${passportNo.value}"`);
      }
    }

    const expiry = fieldMap.get('expiry_date');
    const issue = fieldMap.get('issue_date');
    if (expiry?.value && issue?.value) {
      const expiryDate = new Date(expiry.value);
      const issueDate = new Date(issue.value);
      if (!isNaN(expiryDate.getTime()) && !isNaN(issueDate.getTime()) && expiryDate <= issueDate) {
        issues.push('expiry_date is not after issue_date');
      }
    }
  }

  if (documentType === 'pan_card') {
    const panNo = fieldMap.get('pan_no');
    if (panNo && panNo.value) {
      // PAN numbers in Nepal are typically 9-digit numeric
      if (!/^\d{9}$/.test(panNo.value.replace(/\s/g, ''))) {
        issues.push(`pan_no: expected 9-digit number, got "${panNo.value}"`);
      }
    }
  }

  if (documentType === 'drivers_license') {
    const licenseNo = fieldMap.get('license_no');
    if (licenseNo && licenseNo.value) {
      // License numbers vary but should contain some digits
      if (!/\d/.test(licenseNo.value)) {
        issues.push(`license_no: expected to contain digits, got "${licenseNo.value}"`);
      }
    }
  }

  // Check for low-confidence critical fields
  const schema = DOCUMENT_FIELD_SCHEMAS[documentType];
  const criticalKeys = schema.filter((f) => f.profileKey).map((f) => f.key);
  for (const key of criticalKeys) {
    const field = fieldMap.get(key);
    if (field && field.value && field.confidence < 0.5) {
      issues.push(`${key}: low confidence (${(field.confidence * 100).toFixed(0)}%) — verify manually`);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// suggestWorkflows
// ---------------------------------------------------------------------------

export function suggestWorkflows(
  documentType: DocumentType,
  _fields: ExtractedField[],
): string[] {
  return WORKFLOW_MAP[documentType] || [];
}

// ---------------------------------------------------------------------------
// processDocument — full pipeline
// ---------------------------------------------------------------------------

export async function processDocument(input: {
  imageBase64?: string;
  text?: string;
  fileName?: string;
  mimeType?: string;
}): Promise<ExtractionResult> {
  const warnings: string[] = [];

  // Step 1: Classify
  const classification = await classifyDocument(input);

  if (classification.documentType === 'unknown') {
    return {
      classification,
      fields: [],
      suggestedProfileUpdates: {},
      suggestedWorkflows: [],
      warnings: ['Could not identify document type. Please upload a clearer image or specify the document type.'],
    };
  }

  if (classification.confidence < 0.5) {
    warnings.push(
      `Low classification confidence (${(classification.confidence * 100).toFixed(0)}%). ` +
        `Detected as ${classification.documentType.replace(/_/g, ' ')}` +
        (classification.alternateType
          ? ` — could also be ${classification.alternateType.replace(/_/g, ' ')}`
          : '') +
        '. Please verify.',
    );
  }

  // Step 2: Extract fields
  const fields = await extractFields({
    documentType: classification.documentType,
    imageBase64: input.imageBase64,
    text: input.text,
  });

  // Step 3: Validate
  const validation = validateExtraction(classification.documentType, fields);
  if (!validation.valid) {
    warnings.push(...validation.issues);
  }

  // Step 4: Build profile update suggestions
  const suggestedProfileUpdates: Record<string, string> = {};
  for (const field of fields) {
    if (field.profileKey && field.value && field.confidence >= 0.5) {
      suggestedProfileUpdates[field.profileKey] = field.value;
    }
  }

  // Step 5: Suggest workflows
  const suggestedWorkflows = suggestWorkflows(classification.documentType, fields);

  // Step 6: Collect raw text if available
  const rawText = input.text || undefined;

  return {
    classification,
    fields,
    rawText,
    suggestedProfileUpdates,
    suggestedWorkflows,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// storeExtraction — persist result to Supabase
// ---------------------------------------------------------------------------

export async function storeExtraction(
  supabase: SupabaseClient,
  userId: string,
  vaultDocId: string,
  result: ExtractionResult,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('document_extractions').upsert(
      {
        vault_doc_id: vaultDocId,
        user_id: userId,
        document_type: result.classification.documentType,
        classification_confidence: result.classification.confidence,
        extracted_fields: result.fields.map((f) => ({
          key: f.key,
          value: f.value,
          confidence: f.confidence,
          profile_key: f.profileKey || null,
        })),
        suggested_profile_updates: result.suggestedProfileUpdates,
        suggested_workflows: result.suggestedWorkflows,
        warnings: result.warnings,
        raw_text: result.rawText || null,
        extracted_at: new Date().toISOString(),
      },
      { onConflict: 'vault_doc_id' },
    );

    if (error) {
      // Table may not exist yet — log and return false gracefully
      console.warn('[document-intelligence] storeExtraction error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[document-intelligence] storeExtraction failed:', err);
    return false;
  }
}

import { buildReviewPackage, validateApproval } from './submission-review';

describe('submission review package', () => {
  const adapter = {
    getRequiredDocuments: () => [
      { type: 'citizenship', label: 'Citizenship certificate', required: true },
      { type: 'photos', label: 'Passport photos', required: true },
      { type: 'medical_report', label: 'Medical report', required: false },
    ],
  };

  it('blocks review when required fields or documents are missing', () => {
    const pkg = buildReviewPackage(
      {
        serviceSlug: 'passport-renewal',
        fields: [
          {
            key: 'full_name_en',
            label: 'Full name',
            value: 'Asis Example',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'citizenship_no',
            label: 'Citizenship No',
            value: '',
            status: 'missing',
            source: '',
            confidence: 0,
          },
        ],
      },
      adapter,
      ['photos'],
    );

    expect(pkg.readyToSubmit).toBe(false);
    expect(pkg.blockingReasons.join(' ')).toContain('Missing required fields');
    expect(pkg.blockingReasons.join(' ')).toContain('Missing required documents');
  });

  it('requires declarations and review of low-confidence AI inferred fields', () => {
    const pkg = buildReviewPackage(
      {
        serviceSlug: 'passport-renewal',
        fields: [
          {
            key: 'full_name_en',
            label: 'Full name',
            value: 'Asis Example',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'passport_no',
            label: 'Passport No',
            value: '12345678',
            status: 'inferred',
            source: 'ai_inferred',
            confidence: 0.5,
          },
          {
            key: 'citizenship_no',
            label: 'Citizenship No',
            value: '01-01-77-00001',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'date_of_birth',
            label: 'Date of birth',
            value: '1990-01-01',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'mobile',
            label: 'Mobile',
            value: '9800000000',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'permanent_province',
            label: 'Province',
            value: 'Bagmati',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'permanent_district',
            label: 'District',
            value: 'Kathmandu',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'permanent_municipality',
            label: 'Municipality',
            value: 'Kathmandu',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
          {
            key: 'permanent_ward',
            label: 'Ward',
            value: '1',
            status: 'known',
            source: 'profile',
            confidence: 0.95,
          },
        ],
      },
      adapter,
      ['citizenship', 'photos'],
    );

    expect(pkg.readyToSubmit).toBe(true);

    const missingDeclaration = validateApproval(pkg, {
      approved: true,
      editedFields: {},
      declarationsAccepted: false,
    });
    expect(missingDeclaration.valid).toBe(false);
    expect(missingDeclaration.issues.join(' ')).toContain('legal declarations');

    const unresolvedAiField = validateApproval(pkg, {
      approved: true,
      editedFields: {},
      declarationsAccepted: true,
    });
    expect(unresolvedAiField.valid).toBe(false);
    expect(unresolvedAiField.issues.join(' ')).toContain('AI-inferred');

    const resolved = validateApproval(pkg, {
      approved: true,
      editedFields: { passport_no: '12345678' },
      declarationsAccepted: true,
    });
    expect(resolved.valid).toBe(true);
  });
});

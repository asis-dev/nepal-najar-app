-- Nepal Najar — expand intelligence job types for queued analysis + review flows

ALTER TABLE intelligence_jobs
  DROP CONSTRAINT IF EXISTS intelligence_jobs_job_type_check;

ALTER TABLE intelligence_jobs
  ADD CONSTRAINT intelligence_jobs_job_type_check
  CHECK (
    job_type IN (
      'process_signals_batch',
      'discover_commitment',
      'transcribe_url',
      'run_status_pipeline',
      'review_feedback'
    )
  );

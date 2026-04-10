import { ServiceExecutionPanel } from '@/components/public/services/service-execution-panel';

export function TransportExecutionPanel({
  serviceSlug,
  serviceTitle,
}: {
  serviceSlug: string;
  serviceTitle: string;
}) {
  return <ServiceExecutionPanel serviceSlug={serviceSlug} serviceTitle={serviceTitle} category="transport" />;
}

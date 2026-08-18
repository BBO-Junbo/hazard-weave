import type {
  DashboardPayload,
  DataProviderName,
  ProviderDescriptor,
} from '../../shared/contracts';

export interface DashboardDataProvider {
  descriptor: ProviderDescriptor;
  read(): Promise<DashboardPayload>;
  write?(payload: DashboardPayload): Promise<void>;
  health(): Promise<{
    ok: boolean;
    provider: DataProviderName;
    message: string;
  }>;
}

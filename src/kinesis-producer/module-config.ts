export class KinesisPublisherModuleOptions {
  enableDebugLogs?: boolean;

  constructor(partial: Partial<KinesisPublisherModuleOptions>) {
    Object.assign(this, partial);

    this.enableDebugLogs = !!this.enableDebugLogs;
  }
}

export interface KinesisEvent {
  PartitionKey: string;
  Data: string;
}

export class KinesisEvent {
  constructor(partitionKey: string, data: string) {
    this.PartitionKey = partitionKey;
    this.Data = data;
  }
}

import { Logger, Injectable } from '@nestjs/common';
import { Kinesis } from 'aws-sdk';
import {
  PutRecordsRequestEntry,
  PutRecordsInput,
} from 'aws-sdk/clients/kinesis';
import { KinesisEvent } from './kinesis-event.interface';

@Injectable()
export class BatchKinesisPublisher {
  private readonly baseLogger: Logger;
  private static readonly ONE_MEG = 1024 * 1024;
  protected entries: PutRecordsRequestEntry[] = [];
  protected streamName: string;
  private dataSize: number;
  constructor(protected readonly kinesis: Kinesis) {
    this.baseLogger = new Logger(BatchKinesisPublisher.name);
  }

  async putRecords(streamName: string, events: KinesisEvent[]): Promise<void> {
    this.streamName = streamName;
    for (const x of events) {
      await this.addEntry({
        Data: this.getDataBytes(x.Data),
        PartitionKey: x.PartitionKey,
      });
    }
    await this.flush();
  }
  protected getDataBytes(data: string): Buffer {
    return Buffer.from(data, 'utf8');
  }

  protected async flush(): Promise<void> {
    if (this.entries.length < 1) {
      return;
    }
    const putRecordsInput: PutRecordsInput = {
      StreamName: this.streamName,
      Records: this.entries,
    };
    await this.kinesis.putRecords(putRecordsInput).promise();
    this.entries = [];
  }

  protected async addEntry(entry: PutRecordsRequestEntry): Promise<void> {
    const entryDataSize =
      entry.Data.toString().length + entry.PartitionKey.length;

    if (entryDataSize > BatchKinesisPublisher.ONE_MEG) {
      this.baseLogger.error(
        `FATAL: entry exceeds maximum size of 1M and
                will not be published, partitionkey: ${entry.PartitionKey}`,
      );
      return;
    }

    const newDataSize = this.dataSize + entryDataSize;
    if (newDataSize <= 5 * 1024 * 1024 && this.entries.length < 500) {
      this.dataSize = newDataSize;
      this.entries.push(entry);
    } else {
      await this.flush();
      this.dataSize = 0;
      await this.addEntry(entry);
    }
  }
}

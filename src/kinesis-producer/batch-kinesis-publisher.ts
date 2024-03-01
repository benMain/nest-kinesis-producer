import { Inject, Injectable, Logger } from '@nestjs/common';
import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';
import {
  Kinesis,
  PutRecordsInput,
  PutRecordsRequestEntry,
} from '@aws-sdk/client-kinesis';
import { KinesisEvent } from './kinesis-event.interface';
import { KinesisPublisherModuleOptions } from './module-config';

@Injectable()
export class BatchKinesisPublisher {
  private readonly baseLogger: Logger;
  private static readonly ONE_MEG = 1024 * 1024;
  protected entries: PutRecordsRequestEntry[] = [];
  protected STREAM_NAME: string;
  private dataSize = 0;
  constructor(
    @Inject(KINESIS) protected readonly kinesis: Kinesis,
    @Inject(NEST_KINESIS_PUBLISHER_CONFIG)
    protected readonly options: KinesisPublisherModuleOptions,
  ) {
    this.baseLogger = new Logger(BatchKinesisPublisher.name);
  }

  /**
   * Sends the data records to the stream. Handling the data conversion to a buffer if needed, or
   *
   * @param streamName the stream name
   * @param events data is the format of KinesisEvent, PartitionKey is a string, and Data is either JSON.stringify() or a buffer.
   * if it is JSON.stringify() the data will be buffered prior to sending to kinesis.
   */
  async putRecords(streamName: string, events: KinesisEvent[]): Promise<void> {
    // tslint:disable-next-line
    this.options.enableDebugLogs ||
      this.baseLogger.log(
        `putRecords() invoked for ${events.length} records on stream ${streamName}`,
      );
    this.STREAM_NAME = streamName;
    for (const x of events) {
      await this.addEntry({
        Data: this.getDataBytes(x.Data),
        PartitionKey: x.PartitionKey.toString(),
      });
    }
    await this.flush();
    // tslint:disable-next-line
    this.options.enableDebugLogs ||
      this.baseLogger.log(
        `putRecords() completed for ${events.length} records`,
      );
  }
  protected getDataBytes(data: string): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    } else if (typeof data === 'string') {
      return Buffer.from(data, 'utf8');
    }
    throw Error(
      'Unable to transform event Data into buffer to send to kinesis.',
    );
  }

  protected async flush(): Promise<void> {
    if (this.entries.length < 1) {
      return;
    }
    const putRecordsInput: PutRecordsInput = {
      StreamName: this.STREAM_NAME,
      Records: this.entries,
    };
    await this.kinesis.putRecords(putRecordsInput);
    this.entries = [];
  }

  protected async addEntry(entry: PutRecordsRequestEntry): Promise<void> {
    const entryDataSize: number =
      entry.Data.toString().length + entry.PartitionKey.length;
    if (Number.isNaN(entryDataSize)) {
      this.baseLogger.error(
        `Cannot produce data size of partitionKey: ${
          entry.PartitionKey
        }  |  Data: ${entry.Data.toString()}`,
      );
      return;
    }
    if (entryDataSize > BatchKinesisPublisher.ONE_MEG) {
      this.baseLogger.error(
        `FATAL: entry exceeds maximum size of 1M and will not be published, partitionkey: ${entry.PartitionKey}`,
      );
      return;
    }

    const newDataSize = this.dataSize + entryDataSize;
    if (
      newDataSize <= 5 * BatchKinesisPublisher.ONE_MEG &&
      this.entries.length < 500
    ) {
      this.dataSize = newDataSize;
      this.entries.push(entry);
    } else {
      await this.flush();
      this.dataSize = 0;
      await this.addEntry(entry);
    }
  }
}

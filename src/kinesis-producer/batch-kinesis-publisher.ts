import { Inject, Injectable, Logger } from '@nestjs/common';
import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';
import { PutRecordsInput, PutRecordsRequestEntry } from 'aws-sdk/clients/kinesis';

import { Kinesis } from 'aws-sdk';
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
    @Inject(NEST_KINESIS_PUBLISHER_CONFIG) protected readonly options: KinesisPublisherModuleOptions,
  ) {
    this.baseLogger = new Logger(BatchKinesisPublisher.name);
  }

  /**
   * Writes multiple data records into a Kinesis data stream in a single call
   * (also referred to as a PutRecords request).   For more information, see Adding Data to a Stream in the Amazon Kinesis Data Streams Developer Guide. Each record in the Records array may include an optional parameter, ExplicitHashKey, which overrides the partition key to shard mapping. This parameter allows a data producer to determine explicitly the shard where the record is stored. For more information, see Adding Multiple Records with PutRecords in the Amazon Kinesis Data Streams Developer Guide. The PutRecords response includes an array of response Records. Each record in the response array directly correlates with a record in the request array using natural ordering, from the top to the bottom of the request and response. The response Records array always includes the same number of records as the request array. The response Records array includes both successfully and unsuccessfully processed records. Kinesis Data Streams attempts to process all records in each PutRecords request. A single record failure does not stop the processing of subsequent records. As a result, PutRecords doesn't guarantee the ordering of records. If you need to read records in the same order they are written to the stream, use PutRecord instead of PutRecords, and write to the same shard. A successfully processed record includes ShardId and SequenceNumber values. The ShardId parameter identifies the shard in the stream where the record is stored. The SequenceNumber parameter is an identifier assigned to the put record, unique to all records in the stream. An unsuccessfully processed record includes ErrorCode and ErrorMessage values. ErrorCode reflects the type of error and can be one of the following values: ProvisionedThroughputExceededException or InternalFailure. ErrorMessage provides more detailed information about the ProvisionedThroughputExceededException exception including the account ID, stream name, and shard ID of the record that was throttled. For more information about partially successful responses, see Adding Multiple Records with PutRecords in the Amazon Kinesis Data Streams Developer Guide.  After you write a record to a stream, you cannot modify that record or its order within the stream.  By default, data records are accessible for 24 hours from the time that they are added to a stream. You can use IncreaseStreamRetentionPeriod or DecreaseStreamRetentionPeriod to modify this retention period.
   * @param streamName the kinesis stream name
   * @param events an array of {@link KinesisEvent} events, data not base64 encoded
   * @param encoding the encoded for the messages, defaults to 'utf8'
   */
  async putRecords(streamName: string, events: KinesisEvent[], encoding: BufferEncoding = 'utf8'): Promise<void> {
    // tslint:disable-next-line
    this.options.enableDebugLogs ||
      this.baseLogger.log(`putRecords() invoked for ${events.length} records on stream ${streamName}`);
    this.STREAM_NAME = streamName;
    for (const x of events) {
      await this.addEntry(
        {
          Data: this.getDataBytes(x.Data, encoding),
          PartitionKey: x.PartitionKey.toString(),
          // ...x?.ExplicitHashKey && {ExplicitHashKey: x.ExplicitHashKey}
        },
        encoding,
      );
    }
    await this.flush(encoding);
    // tslint:disable-next-line
    this.options.enableDebugLogs || this.baseLogger.log(`putRecords() completed for ${events.length} records`);
  }
  protected getDataBytes(data: string, encoding: BufferEncoding): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    } else if (typeof data === 'string') {
      return Buffer.from(data, encoding);
    }
    throw Error('Unable to transform event Data into buffer to send to kinesis.');
  }

  protected async flush(encoding: BufferEncoding): Promise<void> {
    if (this.entries.length < 1) {
      return;
    }
    const putRecordsInput: PutRecordsInput = {
      StreamName: this.STREAM_NAME,
      Records: this.entries,
    };
    await this.kinesis.putRecords(putRecordsInput).promise();
    this.entries = [];
  }

  protected async addEntry(entry: PutRecordsRequestEntry, encoding: BufferEncoding): Promise<void> {
    const entryDataSize: number = entry.Data.toString(encoding).length + entry.PartitionKey.length;
    if (Number.isNaN(entryDataSize)) {
      this.baseLogger.error(
        `Cannot produce data size of partitionKey: ${entry.PartitionKey}  |  Data: ${entry.Data.toString(encoding)}`,
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
    if (newDataSize <= 5 * BatchKinesisPublisher.ONE_MEG && this.entries.length < 500) {
      this.dataSize = newDataSize;
      this.entries.push(entry);
    } else {
      await this.flush(encoding);
      this.dataSize = 0;
      await this.addEntry(entry, encoding);
    }
  }
}

import { AWSError, Kinesis } from 'aws-sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { KinesisPublisherModuleOptions } from './module-config';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PutRecordsInput } from 'aws-sdk/clients/kinesis';

@Injectable()
export class RetryingBatchKinesisPublisher extends BatchKinesisPublisher {
  private readonly logger: Logger;
  private static readonly RETRYABLE_ERR_CODES: string[] = [
    'ProvisionedThroughputExceededException',
    'InternalFailure',
    'ServiceUnavailable',
  ];

  constructor(
    @Inject(KINESIS) readonly kinesis: Kinesis,
    @Inject(NEST_KINESIS_PUBLISHER_CONFIG) readonly options: KinesisPublisherModuleOptions,
  ) {
    super(kinesis, options);
    this.logger = new Logger(RetryingBatchKinesisPublisher.name);
  }

  protected async flush(encoding: BufferEncoding): Promise<void> {
    if (this.entries.length < 1) {
      return;
    }
    // tslint:disable-next-line
    this.options.enableDebugLogs || this.logger.debug(`Attempting to flush ${this.entries.length} records!`);

    const putRecordsInput: PutRecordsInput = {
      StreamName: this.STREAM_NAME,
      Records: this.entries,
    };
    let result: PromiseResult<Kinesis.PutRecordsOutput, AWSError>;
    try {
      const promise = this.kinesis.putRecords(putRecordsInput).promise();
      result = await promise;
    } catch (err) {
      this.logger.error(`Caught exception in flush: ${err}`);
      await this.handleException(err, encoding);
      return;
    }
    const intArray = Array.from(Array(result.Records.length).keys());
    const potentialRetries = intArray.map((i) => {
      const entry = this.entries[i];
      const errorCode = result.Records[i].ErrorCode;
      // Determine whether the record should be retried
      if (!!errorCode)
        this.logger.warn(`Kinesis ErrorCode: ${errorCode} ${JSON.stringify(result.Records[i].ErrorMessage)}`);
      if (!!errorCode && RetryingBatchKinesisPublisher.RETRYABLE_ERR_CODES.some((x) => x === errorCode)) {
        return entry;
      } else {
        return null;
      }
    });
    const retries = potentialRetries.filter((x) => !!x);
    this.entries = [];
    if (retries.length > 0) {
      await this.sleep();
      // tslint:disable-next-line
      this.options.enableDebugLogs || this.logger.warn(`There were ${retries.length} records requiring retry.`);
      for (const x of retries) {
        await this.addEntry(x, encoding);
      }
      await this.flush(encoding);
    }
  }

  private async handleException(ex: AWSError, encoding: BufferEncoding): Promise<void> {
    if (ex.statusCode / 100 === 4) {
      this.logger.error(`Unhandleable client error! ${ex.message}`);
      throw ex;
    }
    await this.sleep();
    await this.flush(encoding);
  }

  private sleep(): Promise<void> {
    const sleepTime = Math.floor(Math.random() * 2000);
    this.logger.warn(`Managable client issue, sleeping for ${sleepTime / 1000} seconds`);
    return new Promise((resolve) => setTimeout(resolve, sleepTime));
  }
}

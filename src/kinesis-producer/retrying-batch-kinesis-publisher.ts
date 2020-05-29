import { AWSError, Kinesis } from 'aws-sdk';
import { Injectable, Logger } from '@nestjs/common';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
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

  constructor(readonly kinesis: Kinesis) {
    super(kinesis);
    this.logger = new Logger(RetryingBatchKinesisPublisher.name);
  }

  protected async flush(): Promise<void> {
    if (this.entries.length < 1) {
      return;
    }
    this.logger.log(`Attempting to flush ${this.entries.length} records!`);

    const putRecordsInput: PutRecordsInput = {
      StreamName: this.streamName,
      Records: this.entries,
    };
    let result: PromiseResult<Kinesis.PutRecordsOutput, AWSError>;
    try {
      const promise = this.kinesis.putRecords(putRecordsInput).promise();
      result = await promise;
    } catch (err) {
      this.logger.error(`Caught exception in flush: ${err}`);
      await this.handleException(err);
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
      this.logger.warn(`There were ${retries.length} records requiring retry.`);
      for (const x of retries) {
        await this.addEntry(x);
      }
      await this.flush();
    }
  }

  private async handleException(ex: AWSError): Promise<void> {
    if (ex.statusCode / 100 === 4) {
      this.logger.error(`Unhandleable client error! ${ex.message}`);
      throw ex;
    }
    await this.sleep();
    await this.flush();
  }

  private sleep(): Promise<void> {
    const sleepTime = Math.floor(Math.random() * 2000);
    this.logger.warn(`Managable client issue, sleeping for ${sleepTime / 1000} seconds`);
    return new Promise((resolve) => setTimeout(resolve, sleepTime));
  }
}

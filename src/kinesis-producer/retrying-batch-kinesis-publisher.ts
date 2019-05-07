import { Logger, Injectable } from '@nestjs/common';
import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { Kinesis, AWSError } from 'aws-sdk';
import { PutRecordsInput } from 'aws-sdk/clients/kinesis';
import { PromiseResult } from 'aws-sdk/lib/request';

@Injectable()
export class RetryingBatchKinesisPublisher extends BatchKinesisPublisher {
  private readonly logger: Logger;
  private static readonly MAX_BACKOFF: number = 30000;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly RETRYABLE_ERR_CODES: string[] = [
    'ProvisionedThroughputExceededException',
    'InternalFailure',
    'ServiceUnavailable',
  ];
  private backoff: number;
  private attempt: number;
  private recordAttempts: { [key: string]: number };

  constructor(readonly kinesis: Kinesis) {
    super(kinesis);
    this.logger = new Logger(RetryingBatchKinesisPublisher.name);
    this.reset();
    this.recordAttempts = {};
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
      this.reset();
    } catch (err) {
      this.logger.error(
        `Caught exception in flush | attempts: ${this.attempt}, backoff: ${
          this.backoff
        }, message: ${err}`,
      );
      await this.handleException(err);
      return;
    }
    const intArray = Array.from(Array(result.Records.length).keys());
    const potentialRetries = intArray.map(i => {
      const entry = this.entries[i];
      const stringifiedEntry = JSON.stringify(entry);
      const errorCode = result.Records[i].ErrorCode;
      const recordRetries = this.recordAttempts[stringifiedEntry];
      let retryCount: number = 1;
      if (recordRetries) {
        retryCount += recordRetries;
      }
      // Determine whether the record should be retried
      if (
        errorCode != null &&
        RetryingBatchKinesisPublisher.RETRYABLE_ERR_CODES.some(
          x => x === errorCode,
        ) &&
        retryCount < RetryingBatchKinesisPublisher.MAX_ATTEMPTS
      ) {
        this.recordAttempts[stringifiedEntry] = retryCount;
        return entry;
      } else {
        this.recordAttempts[stringifiedEntry] = 0;
        return null;
      }
    });
    const retries = potentialRetries.filter(x => x !== null);
    this.entries = [];
    if (retries.length > 0) {
      this.logger.warn(`There were ${retries.length} records requiring retry.`);
      for (const x of retries) {
        await this.addEntry(x);
      }
      this.flush();
    }
  }

  private async handleException(ex: AWSError): Promise<void> {
    if (
      this.attempt >= RetryingBatchKinesisPublisher.MAX_ATTEMPTS ||
      ex.statusCode / 100 === 4
    ) {
      this.logger.error(ex.message, 'Unhandleable client error!');
      this.reset();
      throw ex;
    }
    this.logger.warn(
      `Managable client error, sleeping for ${this.backoff / 1000} seconds`,
      ex.message,
    );
    await this.sleep();
    this.backoff = Math.min(
      RetryingBatchKinesisPublisher.MAX_BACKOFF,
      this.backoff * 2,
    );
    this.attempt++;
    await this.flush();
  }

  private reset(): void {
    this.attempt = 1;
    this.backoff = 100;
  }

  private sleep(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.backoff));
  }
}

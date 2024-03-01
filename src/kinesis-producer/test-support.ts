import { KinesisEvent } from './kinesis-event.interface';
import { PutRecordsCommandOutput } from '@aws-sdk/client-kinesis';

export class TestSupport {
  public generateKinesisEvent(): KinesisEvent {
    return {
      Data: JSON.stringify({ Ben: 'Is Awesome!' }),
      PartitionKey: '1',
    };
  }

  public generatePutRecordsCommandOutput(): PutRecordsCommandOutput {
    return {
      Records: [{ ShardId: '1' }],
      $metadata: {},
    };
  }

  public generateRetryableIndividualRecordFailure(): PutRecordsCommandOutput {
    return {
      Records: [
        { ShardId: '1', ErrorCode: 'ProvisionedThroughputExceededException' },
      ],
      $metadata: {},
    };
  }
}

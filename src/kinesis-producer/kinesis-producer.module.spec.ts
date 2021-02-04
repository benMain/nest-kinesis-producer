import { Test, TestingModule } from "@nestjs/testing";
import { Kinesis } from "aws-sdk";
import { KinesisProducerModule } from "./kinesis-producer.module";
import { RetryingBatchKinesisPublisher } from "./retrying-batch-kinesis-publisher";
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('RetryingBatchKinesisPublisher', () => {
    let asyncProvider: RetryingBatchKinesisPublisher;
    let syncProvider: RetryingBatchKinesisPublisher;
  
    beforeEach(async () => {
      const asyncModule: TestingModule = await Test.createTestingModule({
        imports: [ 
            KinesisProducerModule.forRootAsync(
                {
                    useFactory: (cfg: ConfigService) => new Kinesis(),
                    inject: [ConfigService],
                    imports: [ConfigModule],
                }
            )
        ],
      }).compile();

      const syncModule: TestingModule = await Test.createTestingModule({
        imports: [ 
            KinesisProducerModule.forRoot(new Kinesis())
        ],
      }).compile();
  
      asyncProvider = asyncModule.get<RetryingBatchKinesisPublisher>(RetryingBatchKinesisPublisher);
      syncProvider = syncModule.get<RetryingBatchKinesisPublisher>(RetryingBatchKinesisPublisher);

    });

    it('should setup the module correctly async', async () => {
        expect(asyncProvider.kinesis).toBeTruthy();
        expect(asyncProvider.kinesis.putRecords).toBeTruthy()
    })

    it('should setup the module correctly sync', async () => {
        expect(syncProvider.kinesis).toBeTruthy();
        expect(syncProvider.kinesis.putRecords).toBeTruthy()
    })

});
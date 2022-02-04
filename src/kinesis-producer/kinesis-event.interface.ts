export interface KinesisEvent {
  /**
   * Determines which shard in the stream the data record is assigned to.
   * Partition keys are Unicode strings with a maximum length limit of 256
   * characters for each key. Amazon Kinesis Data Streams uses the partition
   * key as input to a hash function that maps the partition key and
   * associated data to a specific shard. Specifically, an MD5 hash function
   * is used to map partition keys to 128-bit integer values and to map associated
   * data records to shards. As a result of this hashing mechanism, all data
   * records with the same partition key map to the same shard within the stream.
   */
  PartitionKey: string;

  // /**
  //  * The hash value used to determine explicitly the shard that the data
  //  * record is assigned to by overriding the partition key hash.
  //  */
  // ExplicitHashKey?: string;

  /**
   * A data blob (string) representation of the data that will be automatically base64 encoded by
   * the aws-sdk-js. A recommended approach is to format json data as:
   * ```
   *
   * const records: KinesisEvent[] = [
   *   {
   *     PartitionKey: uuidv4(),
   *     Data: JSON.stringify({name: "test"}),
   *   },
   * ];
   *
   * await this.kinesisPublisher.putRecords(this.streamName, records);
   * ```
   *
   *
   * A Kinesis subscription consumer can then:
   * ```
   * const stringDecoder = new StringDecoder('utf8');
   * let json = stringDecoder.write(Buffer.from(record.kinesis.data, 'base64'));
   * JSON.parse(json)
   * ```
   * [Further explaination on AWS SDK JS base64 encoding](https://github.com/awslabs/amazon-kinesis-data-generator/issues/5#issuecomment-400353968)
   */
  Data: string;
}

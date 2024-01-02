import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSHandler } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();

export const handler: SQSHandler = async (event) => {
  console.log("Event ", event);
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const snsMessage = JSON.parse(recordBody.Message);

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));

        try {
          const params = { Bucket: srcBucket, Key: srcKey };
          const origImage = await s3.send(new GetObjectCommand(params));

          // Process the image ......
          // Your image processing logic goes here

          await writeToDynamoDB(srcKey);
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
};

async function writeToDynamoDB(imageKey: string): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE; 

  const ddbDocClient = createDDbDocClient();

  const body = { ImageKey: imageKey }; 

  try {
    await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: body,
      })
    );
    console.log(`Item added to DynamoDB table: ${tableName}`);
  } catch (error) {
    console.error("Error writing to DynamoDB:", error);
    throw error;
  }
}

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
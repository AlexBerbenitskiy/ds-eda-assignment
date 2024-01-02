import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM, and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

type FailedImageDetails = {
  srcBucket: string;
  srcKey: string;
};

const client = new SESClient({ region: SES_REGION });

export async function sendFailedImageEmail(details: FailedImageDetails): Promise<void> {
  try {
    const { srcBucket, srcKey } = details;
    const params = {
      Destination: {
        ToAddresses: [SES_EMAIL_TO],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: getHtmlContent({ srcBucket, srcKey }),
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `Failed Image Upload`,
        },
      },
      Source: SES_EMAIL_FROM,
    };

    await client.send(new SendEmailCommand(params));
  } catch (error) {
    console.log("Error sending failed image email:", error);
  }
}

function getHtmlContent({ srcBucket, srcKey }: FailedImageDetails) {
  return `
    <html>
      <body>
        <h2>Image Processing Failure</h2>
        <p>An error occurred during processing the image uploaded to s3://${srcBucket}/${srcKey}</p>
      </body>
    </html> 
  `;
}
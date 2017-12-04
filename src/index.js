import {
  parseEvent as baseParseEvent,
  fetchMessage as baseFetchMessage,
  handler as baseHandler,
  processMessage as baseProcessMessage,
  sendMessage as baseSendMessage,
} from 'aws-lambda-ses-forwarder';
import pg from 'pg';
import makeLookup from './makeLookup';

// Establish a single client and connection so that it's available between
// invocations of the Lambda function if the instance is still up
const client = new pg.Client();

// PG uses the PGUSER, PGHOST, PGPASSWORD, PGDATABASE, and PGPORT environment
// variables by default, so these must be set as environment variables in
// Lambda. See: https://node-postgres.com/features/connecting
client.connect();

// Create a lookup function with this client
const lookup = makeLookup(client);

// These environment variables also need to be set in Lambda.
const {
  FROM_EMAIL: fromEmail,
  SUBJECT_PREFIX: subjectPrefix,
  EMAIL_BUCKET: emailBucket,
  EMAIL_KEY_PREFIX: emailKeyPrefix,
  QUERY: query,
} = process.env;

// Our config object is different from the base in aws-lambda-ses-forwarder,
// because instead of a forwardMapping, we're using a PSQL lookup.
const config = {
  fromEmail,
  subjectPrefix,
  emailBucket,
  emailKeyPrefix,
  query,
};

function transformRecipients(data) {
  // eslint-disable-next-line no-param-reassign
  data.originalRecipients = data.recipients;
  return Promise.all(data.recipients.map((origEmail) => {
    data.log({
      level: 'info',
      message: `Performing lookup for ${origEmail}`,
    });
    return lookup([origEmail.replace(/@namrepus.net$/, '')])
      .then((value) => {
        const user_id = value && value.user_id ? value.user_id : value;
        data.log({
          level: 'info',
          message: `Found ${origEmail} -> ${user_id}`,
        });
        return user_id;
      });
  })).then((newRecipients) => {
    data.log({
      level: 'info',
      message: 'Recipient list created',
    });
    // eslint-disable-next-line no-param-reassign
    data.recipients = newRecipients;
    data.log({
      level: 'info',
      message: data.recipients,
    });
    return Promise.resolve(data);
  });
}

function fetchMessage(data) {
  data.log({
    level: 'info',
    message: 'Calling baseFetchMessage',
  });
  return baseFetchMessage(data);
}

function handler(event, context, callback) {
  // It's OK for Lambda to return the results before the Node event loop is
  // empty: See the documentation and SO discussion:
  // http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html#nodejs-prog-model-context-properties
  // https://stackoverflow.com/questions/41621776/why-does-aws-lambda-function-always-time-out
  const newContext = {
    ...context,
    callbackWaitsForEmptyEventLoop: false,
  };

  // Set our overrides
  const overrides = {
    config,
    steps: [
      baseParseEvent,
      transformRecipients,
      fetchMessage,
      baseProcessMessage,
      baseSendMessage,
    ],
  };
  baseHandler(event, newContext, callback, overrides);
}

export { handler }; // eslint-disable-line import/prefer-default-export

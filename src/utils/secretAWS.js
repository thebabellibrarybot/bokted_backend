const AWS = require('aws-sdk');
const sharp = require('sharp');


// Set the AWS region
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Function to retrieve the secret
async function getSecret(secretName) {
  const secretsManager = new AWS.SecretsManager();

  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    const secretValue = JSON.parse(data.SecretString);
    return secretValue;
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}: ${error}`);
    throw error;
  }
}

async function uploadToS3(files, type, id) {
  try {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1'
      });
    const uploadFiles = await Promise.all(
      files.map(async (file) => {
        console.log('starting uploadFiles')
          const s3FileName = `${id}/${type}/${Date.now()}-${file.originalname}`;
          const metadata = await sharp(file.buffer).metadata();
          await s3
              .upload({
                  Bucket: 'bookedthebookingapp',
                  Key: s3FileName,
                  Body: file.buffer,
                  ContentType: file.mimetype
              })
              .promise();
          return {
              key: s3FileName,
              originalname: file.originalname,
              ContentType: file.mimetype,
              bucket: 'bookedthebookingapp',
              size: file.size,
              adminId: id,
              type: type,
              width: metadata.width,
              height: metadata.height
          };
      })
    );
    return uploadFiles;
  } catch (error) {
    const message = `Imposible to get user booking form: ${error}`
    response.status(CONST.httpStatus.INTERNAL_ERROR).json({ error: message })
  }
}

module.exports = {
    getSecret,
    uploadToS3
    };
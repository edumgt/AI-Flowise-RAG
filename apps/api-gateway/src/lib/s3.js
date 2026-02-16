const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || 'ap-northeast-2';
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';

  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadFileToS3({ key, filePath, contentType }) {
  const Bucket = process.env.S3_BUCKET;
  const Body = fs.createReadStream(filePath);
  const client = s3Client();
  await client.send(new PutObjectCommand({ Bucket, Key: key, Body, ContentType: contentType }));
  return { bucket: Bucket, key };
}

module.exports = { uploadFileToS3 };

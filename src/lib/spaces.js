import { S3Client } from '@aws-sdk/client-s3'

// DO_SPACES_ENDPOINT / DO_SPACES_CDN_URL let a local test run against an S3-compatible server (e.g. MinIO); unset in production
const spaces = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT || `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    forcePathStyle: !!process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
})

export const BUCKET = process.env.DO_SPACES_BUCKET
export const CDN_URL = process.env.DO_SPACES_CDN_URL || `https://${BUCKET}.${process.env.DO_SPACES_REGION}.cdn.digitaloceanspaces.com`

export default spaces

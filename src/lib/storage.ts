import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

type UploadResult = {
  key: string;
  url: string;
};

const imageMimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function readR2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET || "venezuelajuntos";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL || "https://78a499fbb0a01fdbb065ff692ce22d00.r2.cloudflarestorage.com/venezuelajuntos";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 environment variables");
  }

  return {
    endpoint,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
    accessKeyId,
    secretAccessKey,
  };
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image payload");

  const contentType = match[1];
  const extension = imageMimeToExtension[contentType];
  if (!extension) throw new Error("Unsupported image type");

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.byteLength) throw new Error("Empty image payload");
  if (buffer.byteLength > 2_500_000) throw new Error("Image payload too large");

  return { buffer, contentType, extension };
}

export async function uploadReportImage(dataUrl: unknown, prefix: string): Promise<UploadResult | null> {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return null;

  const config = readR2Config();
  const { buffer, contentType, extension } = decodeDataUrl(dataUrl);
  const key = `reports/${prefix}/${Date.now()}-${nanoid(10)}.${extension}`;
  const client = new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicBaseUrl}/${key}`,
  };
}

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new NextResponse("Missing key", { status: 400 });
  }

  // Security check: only allow fetching report images within the reports/ prefix
  if (!key.startsWith("reports/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET || "venezuelajuntos";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      return new NextResponse("Storage config not found", { status: 500 });
    }

    const client = new S3Client({
      endpoint,
      region: "auto",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const s3Response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!s3Response.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    const arrayBuffer = await s3Response.Body.transformToByteArray();

    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": s3Response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to fetch image from R2", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}

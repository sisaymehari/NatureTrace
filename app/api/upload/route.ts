export async function POST(request: Request) {
  const { image_base64, mime_type } = await request.json();
  return Response.json({ url: null, base64: image_base64, mime_type });
}

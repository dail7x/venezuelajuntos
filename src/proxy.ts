import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const password = process.env.ADMIN_BASIC_PASSWORD;
  const username = process.env.ADMIN_BASIC_USER || "admin";

  if (!password) {
    return new NextResponse("Panel admin no configurado.", { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    const [user, pass] = atob(authorization.slice(6)).split(":");
    if (user === username && pass === password) return NextResponse.next();
  }

  return new NextResponse("Autorizacion requerida.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Venezuela Juntos Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};

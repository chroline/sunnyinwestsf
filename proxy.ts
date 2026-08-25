import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (
    request.nextUrl.pathname === "/" &&
    accept.includes("text/markdown") &&
    !accept.includes("text/html")
  ) {
    return NextResponse.rewrite(new URL("/index.md", request.url));
  }

  const response = NextResponse.next();
  response.headers.append("Link", '</llms.txt>; rel="describedby"; type="text/plain"');
  response.headers.append(
    "Link",
    '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
  );
  response.headers.append("Link", '</.well-known/api-catalog>; rel="api-catalog"');
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string | undefined;

    // 1. Admin route protection: requires ADMIN role
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        if (role === "LAWYER") {
          return NextResponse.redirect(new URL("/lawyer/dashboard", req.url));
        } else if (role === "CUSTOMER") {
          return NextResponse.redirect(new URL("/customer/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // 2. Lawyer route protection: requires LAWYER or ADMIN role
    if (pathname.startsWith("/lawyer")) {
      if (role !== "LAWYER" && role !== "ADMIN") {
        if (role === "CUSTOMER") {
          return NextResponse.redirect(new URL("/customer/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // 3. Customer route protection: requires CUSTOMER or ADMIN role
    if (pathname.startsWith("/customer")) {
      if (role !== "CUSTOMER" && role !== "ADMIN") {
        if (role === "LAWYER") {
          return NextResponse.redirect(new URL("/lawyer/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
  }
);

export const config = {
  matcher: [
    "/customer/:path*",
    "/lawyer/:path*",
    "/admin/:path*",
  ],
};

import { redirect } from "next/navigation";

/** Fallback if middleware is bypassed: root always goes to login. */
export default function HomePage() {
  redirect("/login");
}

import { redirect } from "next/navigation";
import { AUTH_CLIENT_URL } from "@/lib/auth/constants";

export default function HomePage() {
  redirect(AUTH_CLIENT_URL);
}

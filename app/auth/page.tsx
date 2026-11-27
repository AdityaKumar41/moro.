import AuthForm from "./auth-form";
import { googleSignInEnabled } from "@/lib/auth-providers";
export default async function Auth() {
  return <AuthForm googleEnabled={await googleSignInEnabled()} />;
}

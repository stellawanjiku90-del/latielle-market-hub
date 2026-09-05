import { Navigate } from "react-router-dom";

// Phone OTP login handles both new and returning users — no separate register page needed.
export default function Register() {
  return <Navigate to="/login" replace />;
}
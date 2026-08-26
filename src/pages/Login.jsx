import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/useAuth";
import { getSession, consumeReturnUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, ShieldCheck, Shield, Store, ShoppingBag, User, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Link, Navigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const [step, setStep] = useState("role"); // role | phone | pin | otp | setpin | profile
  const [selectedRole, setSelectedRole] = useState(null);
  const [phone, setPhone] = useState("+254");
  const [otpCode, setOtpCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);

  if (getSession()) return <Navigate to="/" replace />;

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep("phone");
  };

  // From phone step: try PIN login route
  const goToPin = () => {
    setError("");
    if (!phone || phone.trim().length < 10) { setError("Please enter a valid phone number."); return; }
    setPinCode("");
    setStep("pin");
  };

  const handlePinLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("loginWithPin", { phone: phone.trim(), pin: pinCode });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("Login failed. Please try again.");
      finalizeLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError("");
    if (!phone || phone.trim().length < 10) { setError("Please enter a valid phone number."); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("sendOTP", { phone: phone.trim() });
      if (res.data?.error) throw new Error(res.data.error);
      setStep("otp");
      setOtpCode("");
    } catch (err) {
      setError(err.message || "Failed to send code. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyOTP", {
        phone: phone.trim(),
        code: otpCode,
        role: selectedRole,
      });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("Verification failed. Please try again.");

      const user = data.user;
      setVerifiedUser(user);

      // No name yet → profile setup first; then set PIN.
      if (!user.full_name) {
        setStep("profile");
      } else if (!user.has_pin) {
        setStep("setpin");
        setPinCode(""); setPinConfirm("");
      } else {
        finalizeLogin(user);
      }
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setError("");
    if (!firstName.trim()) { setError("Please enter your first name."); return; }
    if (!surname.trim()) { setError("Please enter your surname."); return; }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${surname.trim()}`;
      await base44.entities.PhoneUser.update(verifiedUser.id, { full_name: fullName });
      const updated = { ...verifiedUser, full_name: fullName };
      setVerifiedUser(updated);
      // After profile, prompt to set a PIN if not set yet
      if (!updated.has_pin) {
        setStep("setpin");
        setPinCode(""); setPinConfirm("");
      } else {
        finalizeLogin(updated);
      }
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    setError("");
    if (!/^\d{4}$/.test(pinCode)) { setError("PIN must be exactly 4 digits."); return; }
    if (pinCode !== pinConfirm) { setError("PINs do not match."); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("setPin", {
        userId: verifiedUser.id,
        phone: phone.trim(),
        pin: pinCode,
      });
      if (res.data?.error) throw new Error(res.data.error);
      // New sign-up → send them to complete their full profile
      finalizeLogin({ ...verifiedUser, has_pin: true }, "/profile");
    } catch (err) {
      setError(err.message || "Failed to set PIN.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = (user, forcedDest) => {
    login({
      userId: user.id,
      phone: user.phone_number,
      role: user.role || selectedRole || "buyer",
      name: user.full_name || "",
      full_name: user.full_name || "",
    });
    const returnUrl = consumeReturnUrl();
    let dest;
    if (forcedDest) {
      dest = forcedDest;
    } else if (returnUrl && returnUrl !== "/login") {
      dest = returnUrl;
    } else {
      // Admins always go to admin dashboard; otherwise honour the role
      // the user just chose on the login screen.
      const role = user.role === "admin" ? "admin" : (selectedRole || user.role);
      if (role === "admin") dest = "/admin";
      else if (role === "seller") dest = "/seller-dashboard";
      else dest = "/buyer-dashboard";
    }
    setTimeout(() => { window.location.href = dest; }, 50);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">LATIELLE MARKET HUB</span>
          </Link>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-8">

          {/* STEP: Role Selection */}
          {step === "role" && (
            <>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Welcome</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">
                How would you like to use Latielle Market Hub?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleRoleSelect("buyer")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-base">I'm a Buyer</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">Browse and enquire about businesses for sale</p>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect("seller")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-accent hover:bg-accent/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                    <Store className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-base">I'm a Seller</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">List your business and connect with buyers</p>
                  </div>
                </button>
              </div>
              <div className="mt-5 text-center">
                <Link to="/browse" className="text-sm text-primary font-medium hover:underline font-body">
                  Browse listings as guest →
                </Link>
              </div>
            </>
          )}

          {/* STEP: Phone Number */}
          {step === "phone" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">
                {selectedRole === "seller" ? "Seller Sign In" : "Buyer Sign In"}
              </h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-1">
                Sign in or create an account with your phone number
              </p>
              <div className="flex justify-center mb-5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-body px-3 py-1 rounded-full ${selectedRole === "seller" ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  {selectedRole === "seller" ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                  Signing up as {selectedRole === "seller" ? "Seller" : "Buyer"}
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-body">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      autoFocus
                      placeholder="+254 700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12 font-body"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-body">Include country code, e.g. +254 for Kenya</p>
                </div>

                <Button onClick={goToPin} className="w-full h-12 font-body font-medium gap-2" disabled={!phone.trim()}>
                  <KeyRound className="h-4 w-4" /> Sign in with PIN
                </Button>
                <Button onClick={handleSendOTP} variant="outline" className="w-full h-12 font-body font-medium" disabled={loading || !phone.trim()}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code...</> : "New here? Send me a code"}
                </Button>
              </div>

              <div className="mt-4 text-center">
                <button onClick={() => { setStep("role"); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground font-body">
                  ← Change role
                </button>
              </div>
            </>
          )}

          {/* STEP: PIN Login */}
          {step === "pin" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Enter Your PIN</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">
                4-digit PIN for<br /><span className="font-medium text-foreground">{phone}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP maxLength={4} value={pinCode} onChange={setPinCode} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button className="w-full h-12 font-body font-medium" onClick={handlePinLogin} disabled={loading || pinCode.length < 4}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4 font-body">
                Forgot PIN?{" "}
                <button onClick={handleSendOTP} className="text-primary font-medium hover:underline">Sign in with a code</button>
              </p>
              <div className="mt-2 text-center">
                <button onClick={() => { setStep("phone"); setPinCode(""); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground font-body">
                  ← Change number
                </button>
              </div>
            </>
          )}

          {/* STEP: OTP Verification */}
          {step === "otp" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Enter Code</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">
                We sent a 6-digit SMS code to<br />
                <span className="font-medium text-foreground">{phone}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button className="w-full h-12 font-body font-medium" onClick={handleVerifyOTP} disabled={loading || otpCode.length < 6}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify & Continue"}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4 font-body">
                Didn't get a code?{" "}
                <button onClick={handleSendOTP} className="text-primary font-medium hover:underline">Resend</button>
              </p>
              <div className="mt-2 text-center">
                <button onClick={() => { setStep("phone"); setOtpCode(""); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground font-body">
                  ← Change number
                </button>
              </div>
            </>
          )}

          {/* STEP: Profile Setup */}
          {step === "profile" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Complete Your Profile</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">
                Tell us a bit about yourself to get started
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-body">First Name *</Label>
                  <Input id="firstName" type="text" autoFocus placeholder="e.g. James" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 font-body" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname" className="font-body">Surname *</Label>
                  <Input id="surname" type="text" placeholder="e.g. Kamau" value={surname} onChange={(e) => setSurname(e.target.value)} className="h-12 font-body" />
                </div>
                <Button className="w-full h-12 font-body font-medium" onClick={handleSaveProfile} disabled={loading || !firstName.trim() || !surname.trim()}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save & Continue"}
                </Button>
              </div>
            </>
          )}

          {/* STEP: Set PIN */}
          {step === "setpin" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Create a PIN</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">
                Set a 4-digit PIN so you can sign in quickly next time — no code needed.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-center block">Choose PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={pinCode} onChange={setPinCode} autoFocus>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-center block">Confirm PIN</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={4} value={pinConfirm} onChange={setPinConfirm}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <Button className="w-full h-12 font-body font-medium" onClick={handleSetPin} disabled={loading || pinCode.length < 4 || pinConfirm.length < 4}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Set PIN & Continue"}
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
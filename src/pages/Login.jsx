import { useState } from "react";
import { api, apiFunction } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, ShieldCheck, Shield, Store, ShoppingBag, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

export default function Login() {
  const { login, user, isAuthenticated, isLoadingAuth, dashboardFor } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Administrator access is deliberately not exposed through the public login UI.
  // It is available only through the private staff entry path and is still
  // protected server-side by the administrator phone allowlist.
  const isPrivateAdminEntry = location.pathname === "/internal-admin-access";
  const requestedRole = !isPrivateAdminEntry ? (["buyer", "seller"].includes(searchParams.get("role")) ? searchParams.get("role") : null) : "admin";
  const [step, setStep] = useState(requestedRole ? "phone" : "role"); // role | phone | pin | signup-pin | payment | profile
  const [selectedRole, setSelectedRole] = useState(requestedRole);
  const [phone, setPhone] = useState("+254");
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  if (!isLoadingAuth && isAuthenticated && user) return <Navigate to={dashboardFor(user)} replace />;

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setAccountNotFound(false);
    setError("");
    setStep("phone");
  };

  // From phone step: try PIN login route
  const goToPin = () => {
    setError("");
    setAccountNotFound(false);
    if (!phone || phone.trim().length < 10) { setError("Please enter a valid phone number."); return; }
    setPinCode("");
    setStep("pin");
  };

  const handlePinLogin = async () => {
    setError("");
    setAccountNotFound(false);
    setLoading(true);
    try {
      const res = await apiFunction("loginWithPin", { phone: phone.trim(), pin: pinCode, role: selectedRole });
      const data = res.data;
      if (data?.token) localStorage.setItem("auth_token", data.token);
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("Login failed. Please try again.");
      finalizeLogin(data.user);
    } catch (err) {
      const message = String(err?.message || "");
      const notFound = /no verified .* account was found/i.test(message);
      setAccountNotFound(notFound);
      setError(
        notFound
          ? `No verified ${selectedRole === "admin" ? "administrator" : selectedRole} account is registered for this phone number.`
          : (message || "We could not sign you in. Please check your details and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartSignup = () => {
    setError("");
    setAccountNotFound(false);
    if (!phone || phone.trim().length < 10) { setError("Please enter a valid Kenyan phone number."); return; }
    setPinCode("");
    setPinConfirm("");
    setFullName("");
    setStep("signup-pin");
  };

  const handleRegistrationPayment = async () => {
    setError("");
    if (fullName.trim().split(/\s+/).length < 2) { setError("Enter your first name and surname exactly as they should appear on your profile."); return; }
    if (!/^\d{4}$/.test(pinCode)) { setError("PIN must be exactly 4 digits."); return; }
    if (pinCode !== pinConfirm) { setError("PINs do not match."); return; }
    setLoading(true);
    try {
      const data = await api.request("/api/auth/register-payment", { method: "POST", skipAuth: true, body: JSON.stringify({ phone: phone.trim(), role: selectedRole, pin: pinCode, name: fullName.trim() }) });
      setStep("payment");
      pollRegistration(data.checkoutRequestId);
    } catch (err) {
      setError(err.message || "Unable to start payment.");
    } finally { setLoading(false); }
  };

  const pollRegistration = async (checkoutId) => {
    let attempts = 0;
    const poll = async () => {
      if (!checkoutId || attempts++ >= 40) return;
      try {
        const result = await api.request(`/api/auth/registration-status/${encodeURIComponent(checkoutId)}`, { skipAuth: true });
        if (result.status === "paid" && result.token && result.user) {
          localStorage.setItem("auth_token", result.token);
          finalizeLogin(result.user);
          return;
        }
        if (result.status === "failed") {
          const details = result.reason ? String(result.reason) : "M-Pesa payment was not completed. Please try again.";
          setError(details);
          return;
        }
      } catch (err) { /* keep polling while payment is pending */ }
      setTimeout(poll, 3000);
    };
    poll();
  };

  const retryRegistrationPayment = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api.request("/api/auth/register-payment", { method: "POST", skipAuth: true, body: JSON.stringify({ phone: phone.trim(), role: selectedRole, pin: pinCode, name: fullName.trim() }) });
      setStep("payment");
      pollRegistration(data.checkoutRequestId);
    } catch (err) {
      setError(err.message || "Unable to start the M-Pesa payment.");
    } finally {
      setLoading(false);
    }
  };


  const finalizeLogin = (user) => {
    // The server returns the authenticated account's role. That role is
    // authoritative and determines the dashboard immediately. A phone number
    // may have both a buyer and seller account, so never infer the destination
    // from the previous URL or from the other account.
    const authenticatedRole = user?.role;
    const dest = authenticatedRole === "admin"
      ? "/admin"
      : authenticatedRole === "seller"
        ? "/seller-dashboard"
        : "/buyer-dashboard";

    login({
      userId: user.id,
      phone: user.phone_number,
      role: authenticatedRole || selectedRole || "buyer",
      name: user.full_name || "",
      full_name: user.full_name || "",
      email: user.email || "",
    });

    // Persist the authenticated session first, then perform a real navigation.
    // This avoids a race where the protected route renders before AuthContext
    // has committed the new auth state, which previously left users on Login.
    window.location.replace(dest);
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
                {selectedRole === "admin" ? "Administrator Sign In" : selectedRole === "seller" ? "Seller Sign In" : "Buyer Sign In"}
              </h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-1">
                Sign in or create an account with your phone number
              </p>
              <div className="flex justify-center mb-5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-body px-3 py-1 rounded-full ${selectedRole === "admin" ? "bg-muted text-foreground" : selectedRole === "seller" ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                  {selectedRole === "admin" ? <ShieldCheck className="h-3 w-3" /> : selectedRole === "seller" ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                  {selectedRole === "admin" ? "Administrator access" : `Signing up as ${selectedRole === "seller" ? "Seller" : "Buyer"}`}
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
                {selectedRole !== "admin" && (
                  <Button onClick={handleStartSignup} variant="outline" className="w-full h-12 font-body font-medium" disabled={loading || !phone.trim()}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting verification...</> : "New here? Verify with KSh 100"}
                  </Button>
                )}
              </div>

              <div className="mt-4 text-center">
                {isPrivateAdminEntry ? (
                  <Link to="/" className="text-sm text-muted-foreground hover:text-foreground font-body">
                    ← Return to LATIELLE MARKET HUB
                  </Link>
                ) : (
                  <button onClick={() => { setStep("role"); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground font-body">
                    ← Change role
                  </button>
                )}
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
              <p className="text-sm text-muted-foreground text-center font-body mb-2">
                4-digit PIN for<br /><span className="font-medium text-foreground">{phone}</span>
              </p>
              <p className="text-xs text-muted-foreground text-center font-body mb-6">
                Signing in as <span className="font-medium text-foreground">{selectedRole === "admin" ? "Administrator" : selectedRole === "seller" ? "Seller" : "Buyer"}</span>. {selectedRole === "admin" ? "Administrator access is restricted to authorised platform numbers." : "The same phone and PIN may be used for your other role account."}
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 text-destructive text-sm font-body">
                  <div className="p-3">{error}</div>
                  {accountNotFound && (
                    <div className="border-t border-destructive/15 px-3 py-3">
                      <button
                        type="button"
                        onClick={handleStartSignup}
                        className="font-medium underline underline-offset-2 hover:no-underline"
                      >
                        Register this {selectedRole} account with this number
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP maxLength={4} value={pinCode} onChange={setPinCode} autoFocus mask>
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

              <p className="text-center text-sm text-muted-foreground mt-4 font-body">Forgot your PIN? Contact Latielle Market Hub support for account recovery.</p>
              <div className="mt-2 text-center">
                <button onClick={() => { setStep("phone"); setPinCode(""); setError(""); setAccountNotFound(false); }} className="text-sm text-muted-foreground hover:text-foreground font-body">
                  ← Change number
                </button>
              </div>
            </>
          )}

          {/* STEP: Signup PIN */}
          {step === "signup-pin" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4"><KeyRound className="h-6 w-6 text-primary" /></div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Create Your PIN</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-6">Set a 4-digit PIN, then pay a one-time <span className="font-medium text-foreground">KSh 100 verification fee</span>.</p>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body">{error}</div>}
              <div className="space-y-4 mb-5">
                <div><Label className="font-body">Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. James Kamau" className="h-11 mt-1" autoComplete="name" /></div>
                <p className="text-xs text-muted-foreground">Use your real name. Once the KSh 100 verification payment succeeds, this verified name is locked on your account and cannot be edited.</p>
              </div>
              <div className="space-y-5">
                <div><Label className="font-body mb-2 block">4-digit PIN</Label><div className="flex justify-center"><InputOTP maxLength={4} value={pinCode} onChange={setPinCode} autoFocus mask><InputOTPGroup><InputOTPSlot index={0}/><InputOTPSlot index={1}/><InputOTPSlot index={2}/><InputOTPSlot index={3}/></InputOTPGroup></InputOTP></div></div>
                <div><Label className="font-body mb-2 block">Confirm PIN</Label><div className="flex justify-center"><InputOTP maxLength={4} value={pinConfirm} onChange={setPinConfirm} mask><InputOTPGroup><InputOTPSlot index={0}/><InputOTPSlot index={1}/><InputOTPSlot index={2}/><InputOTPSlot index={3}/></InputOTPGroup></InputOTP></div></div>
                <Button className="w-full h-12 font-body font-medium" onClick={handleRegistrationPayment} disabled={loading || fullName.trim().split(/\s+/).length < 2 || pinCode.length<4 || pinConfirm.length<4}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Starting M-Pesa...</> : "Pay KSh 100 & Verify"}</Button>
              </div>
              <button onClick={() => { setStep("phone"); setError(""); }} className="w-full mt-5 text-sm text-muted-foreground hover:text-foreground font-body">← Back</button>
            </>
          )}

          {/* STEP: M-Pesa Registration Verification */}
          {step === "payment" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-center text-foreground mb-1">Verify Your Account</h1>
              <p className="text-sm text-muted-foreground text-center font-body mb-5">
                An M-Pesa prompt for <span className="font-medium text-foreground">KSh 100</span> has been sent to<br />
                <span className="font-medium text-foreground">{phone}</span>
              </p>
              {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-body leading-6">{error}</div>}
              {!error ? (
                <>
                  <div className="rounded-xl border p-4 bg-primary/5 text-sm font-body space-y-2">
                    <p className="font-semibold">Check your phone for the M-Pesa prompt.</p>
                    <p className="text-muted-foreground">Keep the phone on and connected to the Safaricom network. Enter your M-Pesa PIN when the prompt appears.</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Waiting for payment confirmation...</div>
                </>
              ) : (
                <Button className="w-full h-11 mt-2" onClick={retryRegistrationPayment} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting M-Pesa...</> : "Try KSh 100 payment again"}
                </Button>
              )}
              <button onClick={() => { setStep("signup-pin"); setError(""); }} className="w-full mt-5 text-sm text-muted-foreground hover:text-foreground font-body">← Back</button>
            </>
          )}


        </div>
      </div>
    </div>
  );
}
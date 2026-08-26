import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getSession, redirectToLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Upload, Shield, MapPin, Image, Phone } from "lucide-react";
import LocationPicker from "../components/LocationPicker";
import FileUploader from "../components/FileUploader";
import SearchableSelect from "../components/SearchableSelect";
import { KENYA_COUNTIES, getCountyData, getTownsForSubCounty, getAllTownsForCounty } from "../utils/kenyaLocations";

const CATEGORIES = [
  // Food & Beverage
  "Restaurant", "Café", "Fast Food / Takeaway", "Bakery", "Butchery", "Juice Bar", "Bar / Pub", "Catering Business",
  // Retail & Shops
  "Supermarket", "Grocery Store / Duka", "Boutique / Clothing Store", "Electronics Shop", "Hardware Shop",
  "Pharmacy / Chemist", "Bookshop", "Furniture Store", "Shoe & Accessories Shop", "Second-Hand Clothes (Mitumba)",
  "Toy Store", "General Shop",
  // Hospitality & Tourism
  "Hotel", "Lodging / Guest House / B&B", "Travel Agency", "Event Planning",
  // Beauty & Wellness
  "Salon", "Barbershop", "Spa", "Nail Studio", "Tattoo Studio", "Gym", "Physiotherapy Centre",
  // Health & Medical
  "Clinic / Medical Centre", "Dental Clinic", "Optician",
  // Education
  "School", "College / Training Centre", "Tutoring Centre", "Daycare / Nursery",
  // Services
  "Cyber Café", "Printing & Photocopying", "Laundry / Dry Cleaning", "Water Refilling Station", "Car Wash", "Petrol Station",
  "Driving School", "Courier & Delivery", "Photography Studio", "Cleaning Services", "Security Services",
  "Tailoring / Dressmaking", "Welding & Fabrication", "Carpentry / Furniture Making", "Electrical & Plumbing Services",
  "Mobile Money / Agency Banking", "Salon & Beauty Supplies", "Animal Feeds / Agrovet", "Gas Refilling / Cooking Gas",
  // Auto
  "Auto Garage / Repair", "Car Dealership", "Auto Spare Parts", "Motorcycle Dealership", "Tyre Shop",
  // Financial Services
  "M-Pesa Agency", "Insurance Agency", "Forex Bureau", "SACCO / Microfinance",
  // Agriculture & Food Processing
  "Farm / Agricultural Business", "Poultry Farm", "Fish Business", "Dairy Business", "Flour Mill",
  "Posho Mill (Maize Milling)", "Animal Feed Production", "Greenhouse / Horticulture", "Cereals & Grains Store",
  // Real Estate & Construction
  "Real Estate Agency", "Construction Company", "Interior Design",
  // Technology
  "Software / Tech Company", "IT Support", "Phone Repair",
  // Online Businesses
  "E-commerce Store", "Social Media Business", "Digital Agency", "Dropshipping Business", "Online Services",
  // Other
  "Franchise", "Other",
];
const REASON_OPTIONS = [
  "Relocating to another city or country",
  "Retirement",
  "Health reasons",
  "Pursuing other business interests",
  "Financial difficulties",
  "Family reasons / personal commitments",
  "Lack of time to manage the business",
  "Partnership dissolution",
  "Business not meeting expectations",
  "Other",
];

const DESCRIPTION_TEMPLATES = [
  { label: "Well-established business", text: "This is a well-established business with a loyal customer base built over the years. Located in a prime area with high foot traffic, it benefits from strong brand recognition in the local community. The business is fully operational with trained staff, established supplier relationships, and consistent monthly revenue. This is a turnkey opportunity for any buyer looking to step into a profitable and running enterprise." },
  { label: "Prime location, strong revenue", text: "Strategically located in a high-traffic area, this business has been generating strong and consistent monthly revenue. The premises are well-maintained, and all equipment is in excellent working condition. The business serves a large and loyal client base, with significant room for growth through expanded services and marketing. Full operational support will be offered during handover." },
  { label: "Growth opportunity", text: "This business presents a great growth opportunity for an ambitious entrepreneur. Currently operating at moderate capacity, there is significant untapped potential to scale revenues through increased marketing, extended operating hours, and additional product/service offerings. The current infrastructure and setup are solid, making this an ideal acquisition for a buyer ready to take it to the next level." },
  { label: "Family-run, retiring seller", text: "This is a thriving family-run business that has served our community with pride for many years. Due to the owner's retirement, we are now offering it for sale to someone who can continue its legacy. The business has a strong reputation, established clientele, and reliable staff. All financials, records, and supplier contacts will be shared with a serious buyer." },
  { label: "Online/service-based business", text: "This is a fully online/service-based business that can be operated from anywhere. It comes with an established client portfolio, recurring service contracts, and a strong digital presence. The business requires low overhead and minimal physical infrastructure, making it ideal for a buyer seeking a flexible, location-independent income stream. All systems, tools, and client relationships will be transferred upon sale." },
];

const SUPPLIER_TEMPLATES = [
  { label: "Multiple local suppliers", text: "The business sources products from multiple reliable local suppliers with established credit terms. Key suppliers have been partners for over 2 years and offer competitive pricing. A full supplier list with contacts will be shared upon request after sale." },
  { label: "Single main supplier", text: "The business operates with one primary supplier who provides consistent stock on a weekly/monthly basis. The relationship is strong and the supplier has indicated willingness to continue with a new owner. Payment terms and credit limits are well-established." },
  { label: "Imported goods", text: "Products are sourced directly from international suppliers, primarily through established import channels. The business benefits from competitive pricing due to bulk purchasing. Full import documentation, supplier contacts, and ordering procedures will be handed over to the buyer." },
  { label: "Service-based, no physical stock", text: "As a service-based business, there are no physical product suppliers. All service tools, software subscriptions, and vendor relationships are in place and will be transferred to the new owner upon sale." },
];

const STAFF_TEMPLATES = [
  { label: "Small dedicated team", text: "The business has a small, dedicated team of trained employees who are familiar with daily operations. Staff are experienced, reliable, and willing to continue under new ownership. Full details on roles, responsibilities, and salary structure will be provided to serious buyers." },
  { label: "Owner-operated", text: "The business is primarily owner-operated with minimal staff support. Day-to-day operations are managed directly by the owner, making it easy to transition to a new owner with a short handover period." },
  { label: "Larger workforce", text: "The business employs a well-organized team across various roles including operations, sales, and support. All staff are on formal employment contracts. HR records, staff performance history, and salary schedules will be disclosed to the buyer after signing an NDA." },
  { label: "Part-time/casual staff", text: "The business uses a mix of part-time and casual staff during peak periods. This keeps labour costs flexible and manageable. A breakdown of shifts, pay rates, and staffing needs will be shared with a serious buyer." },
];

const GROSS_SALES_RANGES = ["Under KES 50,000", "KES 50,000 - 100,000", "KES 100,000 - 250,000", "KES 250,000 - 500,000", "KES 500,000 - 1,000,000", "Over KES 1,000,000"];
const NET_SALES_RANGES = ["Under KES 20,000", "KES 20,000 - 50,000", "KES 50,000 - 100,000", "KES 100,000 - 250,000", "KES 250,000 - 500,000", "Over KES 500,000"];

const STEPS = ["Basic Info", "Details", "Confidential", "Review"];
const LISTING_FEES = { basic: 2000, featured: 3000, premium: 4000 };

export default function CreateListing() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [form, setForm] = useState({
    title: "", category: "", county: "", sub_county: "", town: "", asking_price: "", years_operating: "",
    employees: "", reason_for_selling: "", description: "", listing_type: "basic",
    exact_location: "", location_lat: null, location_lng: null, supplier_info: "", staff_info: "", seller_phone: "",
    monthly_gross_sales: "", monthly_net_sales: "", financial_records_available: "",
    photos: [], videos: [], business_licence: [], registration_cert: [], owner_id_docs: [],
  });

  useEffect(() => {
    const session = getSession();
    if (!session) { redirectToLogin("/create-listing"); return; }
    setUser(session);
    if (session?.phone) setPaymentPhone(session.phone);
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const countyData = getCountyData(form.county);
  const availableTowns = form.sub_county
    ? getTownsForSubCounty(form.county, form.sub_county)
    : getAllTownsForCounty(form.county);

  const validateStep = (s) => {
    if (s === 0) {
      if (!form.category) { toast.error("Please select a business category."); return false; }
      if (!form.county) { toast.error("Please select a county."); return false; }
      if (!form.town) { toast.error("Please select a town or area — this helps buyers find your business."); return false; }
      if (!form.asking_price) { toast.error("Please enter an asking price."); return false; }
    }
    if (s === 1) {
      if (!form.description) { toast.error("Please add a business description."); return false; }
      if (!form.photos.length) { toast.error("Please upload at least one business photo."); return false; }
    }
    if (s === 2) {
      if (!form.business_licence.length) { toast.error("Please upload your business licence document."); return false; }
      if (!form.registration_cert.length) { toast.error("Please upload your business registration certificate."); return false; }
      if (!form.owner_id_docs.length) { toast.error("Please upload your National ID or Driving Licence."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = async (asDraft) => {
    if (!asDraft && !paymentPhone.trim()) {
      toast.error("Please enter your M-Pesa phone number to pay the listing fee.");
      return;
    }
    setSubmitting(true);
    const data = {
      ...form,
      asking_price: Number(form.asking_price) || 0,
      monthly_gross_sales: form.monthly_gross_sales || undefined,
      monthly_net_sales: form.monthly_net_sales || undefined,
      years_operating: Number(form.years_operating) || 0,
      employees: Number(form.employees) || 0,
      exact_location: form.exact_location || [form.town, form.sub_county, form.county].filter(Boolean).join(", "),
      status: asDraft ? "draft" : "pending",
    };
    const listing = await base44.entities.BusinessListing.create(data);

    if (!asDraft) {
      const fee = LISTING_FEES[form.listing_type] || 2000;
      const res = await base44.functions.invoke('mpesaStkPush', {
        phone: paymentPhone.trim(),
        amount: fee,
        detailRequestId: listing.id,
        listingTitle: `Listing Fee: ${form.title || form.category}`,
      });
      if (res.data?.success) {
        toast.success(`M-Pesa prompt sent! Enter your PIN to pay KES ${fee.toLocaleString()} listing fee.`);
      } else {
        toast.error(res.data?.error || "Listing saved but payment prompt failed. Contact support.");
      }
    } else {
      toast.success("Draft saved!");
    }

    navigate("/seller-dashboard");
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <div className="pt-20 pb-16 min-h-screen bg-secondary/20">
      <div className="max-w-2xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
        <h1 className="font-heading text-2xl font-bold mb-2">List Your Business</h1>
        <p className="text-sm text-muted-foreground font-body mb-8">Fill in the details below. Your listing will be reviewed before publishing.</p>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
              <p className={`text-[10px] font-body mt-1 ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card><CardHeader><CardTitle className="font-heading text-lg">Basic Information</CardTitle><CardDescription className="font-body">Public details visible to all buyers</CardDescription></CardHeader>
            <CardContent className="space-y-5 font-body">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Business Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select onValueChange={v => update("title", v)}>
                    <SelectTrigger className="w-auto text-xs h-7 px-2 border-dashed"><SelectValue placeholder="Use template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Profitable [Category] for Sale in [County]">Profitable [Category] for Sale in [County]</SelectItem>
                      <SelectItem value="Well-Established Business – Motivated Seller">Well-Established Business – Motivated Seller</SelectItem>
                      <SelectItem value="Turnkey Business Opportunity – Ready to Operate">Turnkey Business Opportunity – Ready to Operate</SelectItem>
                      <SelectItem value="Thriving Business with Loyal Customer Base">Thriving Business with Loyal Customer Base</SelectItem>
                      <SelectItem value="Busy Business in Prime Location – Owner Relocating">Busy Business in Prime Location – Owner Relocating</SelectItem>
                      <SelectItem value="Established Business – Selling Due to Retirement">Established Business – Selling Due to Retirement</SelectItem>
                      <SelectItem value="Fast-Growing Business – Great Investment Opportunity">Fast-Growing Business – Great Investment Opportunity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="e.g., Profitable Restaurant in Westlands" value={form.title} onChange={e => update("title", e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Pick a template above and customize it, or type your own</p>
              </div>
              <div><Label>Category *</Label><SearchableSelect options={CATEGORIES} value={form.category} onChange={v => update("category", v)} placeholder="Select category" searchPlaceholder="Search categories..." /></div>

              {/* Location — mandatory */}
              <div className="rounded-xl border border-primary/20 bg-primary/3 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Business Location <span className="text-destructive">*</span></p>
                  <span className="text-xs text-muted-foreground">(required — helps buyers find your area)</span>
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">County *</Label>
                  <Select value={form.county} onValueChange={v => { update("county", v); update("sub_county", ""); update("town", ""); }}>
                    <SelectTrigger><SelectValue placeholder="Select county..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {KENYA_COUNTIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {countyData && (
                  <div>
                    <Label className="text-xs mb-1.5 block">Sub-County</Label>
                    <Select value={form.sub_county} onValueChange={v => { update("sub_county", v); update("town", ""); }}>
                      <SelectTrigger><SelectValue placeholder="Select sub-county..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countyData.subCounties.map(sc => <SelectItem key={sc.name} value={sc.name}>{sc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.county && (
                  <div>
                    <Label className="text-xs mb-1.5 block">Town / Area *</Label>
                    <Select value={form.town} onValueChange={v => update("town", v)}>
                      <SelectTrigger><SelectValue placeholder={form.sub_county ? `Towns in ${form.sub_county}...` : "Select town or area..."} /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableTowns.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.county && form.town && (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">{[form.town, form.sub_county, `${form.county} County`].filter(Boolean).join(", ")}</p>
                  </div>
                )}
              </div>

              <div><Label>Asking Price (KES) *</Label><Input type="number" placeholder="e.g., 2500000" value={form.asking_price} onChange={e => update("asking_price", e.target.value)} /></div>
              <div><Label>Listing Type</Label><Select value={form.listing_type} onValueChange={v => update("listing_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="basic">Standard — KES 2,000</SelectItem><SelectItem value="featured">Featured — KES 3,000</SelectItem><SelectItem value="premium">Premium — KES 4,000</SelectItem></SelectContent></Select></div>

            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card><CardHeader><CardTitle className="font-heading text-lg">Business Details</CardTitle><CardDescription className="font-body">Help buyers understand the business</CardDescription></CardHeader>
            <CardContent className="space-y-4 font-body">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Years Operating</Label><Input type="number" value={form.years_operating} onChange={e => update("years_operating", e.target.value)} /></div>
                <div><Label>Employees</Label><Input type="number" value={form.employees} onChange={e => update("employees", e.target.value)} /></div>
              </div>

              <div>
                <Label>Monthly Gross Sales (KES)</Label>
                <Select value={form.monthly_gross_sales} onValueChange={v => update("monthly_gross_sales", v)}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>{GROSS_SALES_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Total revenue before expenses</p>
              </div>
              <div>
                <Label>Monthly Net Sales / Profit (KES)</Label>
                <Select value={form.monthly_net_sales} onValueChange={v => update("monthly_net_sales", v)}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>{NET_SALES_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Profit after all expenses</p>
              </div>
              <div>
                <Label>Financial Records Available?</Label>
                <Select value={form.financial_records_available} onValueChange={v => update("financial_records_available", v)}>
                  <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes_full">Yes — Full records available</SelectItem>
                    <SelectItem value="yes_partial">Yes — Partial records available</SelectItem>
                    <SelectItem value="upon_request">Available upon request</SelectItem>
                    <SelectItem value="no">No records available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-5">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Photos &amp; Videos <span className="text-xs font-normal text-muted-foreground">(made public after approval)</span></p>
                </div>
                <FileUploader
                  label="Business Photos"
                  accept="image/*"
                  multiple
                  value={form.photos}
                  onChange={v => update("photos", v)}
                  hint="Upload clear photos of the premises, equipment, and products"
                />
                <FileUploader
                  label="Business Videos (optional)"
                  accept="video/*"
                  multiple
                  value={form.videos}
                  onChange={v => update("videos", v)}
                  hint="Optional — you can add a short walkthrough video now or skip and add it later"
                />
              </div>

              <div>
                <Label>Reason for Selling</Label>
                <Select value={form.reason_for_selling} onValueChange={v => update("reason_for_selling", v)}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>{REASON_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Description *</Label>
                  <Select onValueChange={v => update("description", v)}>
                    <SelectTrigger className="w-auto text-xs h-7 px-2 border-dashed">
                      <SelectValue placeholder="Quick-start template" />
                    </SelectTrigger>
                    <SelectContent>{DESCRIPTION_TEMPLATES.map(t => <SelectItem key={t.label} value={t.text}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea rows={6} placeholder="Describe the business, its strengths, opportunities..." value={form.description} onChange={e => update("description", e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Pick a template above to get started, then customize it to match your business</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card><CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Confidential Information</CardTitle><CardDescription className="font-body">This information is only shared with approved buyers</CardDescription></CardHeader>
            <CardContent className="space-y-4 font-body">
              <div>
                <Label className="mb-2 block">Exact Business Location (Map Pin)</Label>
                <LocationPicker
                  value={form.location_lat ? { lat: form.location_lat, lng: form.location_lng, address: form.exact_location } : null}
                  onChange={({ lat, lng, address }) => {
                    update("location_lat", lat);
                    update("location_lng", lng);
                    update("exact_location", address || "");
                  }}
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Confidential Documents</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">These documents are kept private and only shared with verified buyers upon request. They help build trust and speed up the sale.</p>
                </div>
                <FileUploader
                  label="Business Licence(s)"
                  accept="image/*,application/pdf"
                  multiple
                  value={form.business_licence}
                  onChange={v => update("business_licence", v)}
                  hint="Upload your current single business permit or county licence"
                />
                <FileUploader
                  label="Business Registration Certificate"
                  accept="image/*,application/pdf"
                  multiple
                  value={form.registration_cert}
                  onChange={v => update("registration_cert", v)}
                  hint="Certificate of incorporation or business name registration"
                />
                <FileUploader
                  label="Owner National ID / Driving Licence"
                  accept="image/*,application/pdf"
                  multiple
                  value={form.owner_id_docs}
                  onChange={v => update("owner_id_docs", v)}
                  hint="Front and back of your National ID or Driving Licence"
                />
              </div>

              <div><Label>Your Phone Number</Label><Input placeholder="+254 7XX XXX XXX" value={form.seller_phone} onChange={e => update("seller_phone", e.target.value)} /></div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Supplier Information</Label>
                  <Select onValueChange={v => update("supplier_info", v)}>
                    <SelectTrigger className="w-auto text-xs h-7 px-2 border-dashed"><SelectValue placeholder="Use template" /></SelectTrigger>
                    <SelectContent>{SUPPLIER_TEMPLATES.map(t => <SelectItem key={t.label} value={t.text}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea rows={3} placeholder="Key suppliers, terms..." value={form.supplier_info} onChange={e => update("supplier_info", e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Staff Information</Label>
                  <Select onValueChange={v => update("staff_info", v)}>
                    <SelectTrigger className="w-auto text-xs h-7 px-2 border-dashed"><SelectValue placeholder="Use template" /></SelectTrigger>
                    <SelectContent>{STAFF_TEMPLATES.map(t => <SelectItem key={t.label} value={t.text}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea rows={3} placeholder="Number of staff, roles, salaries..." value={form.staff_info} onChange={e => update("staff_info", e.target.value)} />
              </div>

            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card><CardHeader><CardTitle className="font-heading text-lg">Review Your Listing</CardTitle></CardHeader>
            <CardContent className="space-y-3 font-body text-sm">
              {[
                ["Category", form.category],
                ["Title", form.title || "(not set)"],
                ["County", form.county],
                ["Sub-County", form.sub_county || "—"],
                ["Town / Area", form.town],
                ["Asking Price", form.asking_price ? `KES ${Number(form.asking_price).toLocaleString()}` : "—"],
                ["Type", form.listing_type],
                ["Gross Sales", form.monthly_gross_sales || "—"],
                ["Net Profit", form.monthly_net_sales || "—"],
                ["Years", form.years_operating || "—"],
                ["Photos", form.photos.length ? `${form.photos.length} uploaded` : "None"],
                ["Videos", form.videos.length ? `${form.videos.length} uploaded` : "None"],
                ["Licence Docs", form.business_licence.length ? `${form.business_licence.length} uploaded` : "None"],
                ["Reg. Certificate", form.registration_cert.length ? `${form.registration_cert.length} uploaded` : "None"],
                ["Owner ID", form.owner_id_docs.length ? `${form.owner_id_docs.length} uploaded` : "None"],
                ["Employees", form.employees || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">Your listing will be reviewed by our team before it appears on the marketplace. This typically takes 24-48 hours.</p>

              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-sm font-semibold text-foreground">Listing Fee Payment</p>
                <p className="text-xs text-muted-foreground">
                  A listing fee of <span className="font-semibold text-foreground">KES {(LISTING_FEES[form.listing_type] || 2000).toLocaleString()}</span> is required to submit for review. You'll receive an M-Pesa STK Push to pay.
                </p>
                <Label className="text-xs font-medium flex items-center gap-1.5 mt-2"><Phone className="h-3 w-3" />M-Pesa Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={paymentPhone}
                  onChange={e => setPaymentPhone(e.target.value)}
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)} className="font-body"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button> : <div />}
          {step < 3 ? (
            <Button onClick={handleNext} className="font-body">Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting} className="font-body">Save as Draft</Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="font-body">{submitting ? "Submitting..." : "Submit for Review"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
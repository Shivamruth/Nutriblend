import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { countries } from "../data/countries";
import { indiaStatesDistricts } from "../data/indiaStatesDistricts";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase/Client";
import "../styles/address.css";

const DELIVERY_TIMES = ["Morning", "Afternoon", "Evening", "Custom"];
const ADDRESS_TYPES = ["Home", "Hostel", "Gym", "Office", "Other"];

const EMPTY_FORM = {
  fullName: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  country: "India",
  state: "",
  district: "",
  city: "",
  pincode: "",
  houseNo: "",
  building: "",
  street: "",
  landmark: "",
  addressType: "Home",
  deliveryTime: "Morning",
  customDeliveryTime: "",
  orderNote: "",
  lat: null,
  lng: null,
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const buildStreet = (addr) =>
  [addr.houseNo || addr.address_line_1, addr.building || addr.address_line_2, addr.street]
    .filter(Boolean)
    .join(", ");

/** Map DB row → form fields */
const dbToForm = (row) => ({
  fullName:          row.full_name   || row.name || "",
  mobile:            row.phone       || "",
  alternateMobile:   row.alternate_phone || "",
  email:             row.email       || "",
  country:           row.country     || "India",
  state:             row.state       || "",
  district:          row.district    || "",
  city:              row.city        || "",
  pincode:           row.postal_code || row.pincode || "",
  houseNo:           row.address_line_1 || "",
  building:          row.address_line_2 || "",
  street:            row.street      || "",
  landmark:          row.landmark    || "",
  addressType:       row.address_type || row.type || "Home",
  deliveryTime:      row.delivery_time || "Morning",
  customDeliveryTime: row.custom_delivery_time || "",
  orderNote:         row.order_note  || "",
  lat:               row.latitude    || null,
  lng:               row.longitude   || null,
});

/** Map form → DB insert/update payload */
const formToDb = (form, userId) => ({
  user_id:              userId,
  full_name:            form.fullName,
  name:                 form.fullName,           // legacy compat
  phone:                form.mobile,
  alternate_phone:      form.alternateMobile || null,
  email:                form.email || null,
  country:              form.country,
  state:                form.state,
  district:             form.district,
  city:                 form.city,
  postal_code:          form.pincode,
  pincode:              form.pincode,            // legacy compat
  address_line_1:       form.houseNo,
  address_line_2:       form.building || null,
  street:               form.street,
  landmark:             form.landmark || null,
  address_type:         form.addressType,
  type:                 form.addressType,         // legacy compat
  delivery_time:        form.deliveryTime,
  custom_delivery_time: form.deliveryTime === "Custom" ? form.customDeliveryTime : null,
  order_note:           form.orderNote || null,
  latitude:             form.lat    != null ? Number(form.lat)  : null,
  longitude:            form.lng    != null ? Number(form.lng)  : null,
  is_default:           false,
});

/** Build the localStorage-compatible checkout address (for Payment.jsx backward compat) */
const toCheckoutAddress = (row, formFields = null) => {
  const src = formFields || row;
  return {
    id:       row.id,
    name:     row.full_name || row.name || src.fullName,
    phone:    row.phone     || src.mobile,
    email:    row.email     || src.email || null,
    street:   buildStreet(row.address_line_1 ? row : {
      houseNo: src.houseNo, building: src.building, street: src.street,
    }),
    landmark: row.landmark  || src.landmark || null,
    city:     row.city      || src.city,
    district: row.district  || src.district,
    state:    row.state     || src.state,
    pincode:  row.postal_code || row.pincode || src.pincode,
    type:     row.address_type || row.type || src.addressType,
    lat:      row.latitude  || src.lat || null,
    lng:      row.longitude || src.lng || null,
    is_default: !!row.is_default,
  };
};

export default function Addresses({ setPage, setAddress }) {
  const { notify } = useNotification();
  const [userId, setUserId]         = useState(null);
  const [addresses, setAddresses]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingId, setEditingId]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [pinStatus, setPinStatus]   = useState({ state: "idle", message: "" });
  const [checkingPin, setCheckingPin] = useState(false);
  const [locating, setLocating]     = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [saving, setSaving]         = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const states    = useMemo(() => Object.keys(indiaStatesDistricts), []);
  const districts = form.country === "India" && form.state
    ? indiaStatesDistricts[form.state] || []
    : [];

  // ── Fetch user & addresses ──────────────────────────────────────────
  const loadAddresses = useCallback(async (uid) => {
    setLoadingAddresses(true);
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Address fetch error:", error);
      notify("Could not load addresses", "error");
    } else {
      setAddresses(data || []);
      // Pre-select default or first
      const defaultAddr = (data || []).find((a) => a.is_default) || data?.[0];
      if (defaultAddr) {
        setSelectedId(defaultAddr.id);
        const checkout = toCheckoutAddress(defaultAddr);
        setAddress?.(checkout);
        localStorage.setItem("selectedAddress", JSON.stringify(checkout));
      }
      setShowForm(!data || data.length === 0);
    }
    setLoadingAddresses(false);
  }, [notify, setAddress]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) {
        setUserId(uid);
        loadAddresses(uid);
      }
    });
  }, [loadAddresses]);

  // ── PIN verification ────────────────────────────────────────────────
  useEffect(() => {
    if (form.country !== "India") {
      setPinStatus({ state: "verified", message: "International address selected" });
      return;
    }
    if (form.pincode.length !== 6) {
      setPinStatus({ state: "idle", message: "Enter a 6-digit PIN code" });
      return;
    }
    if (!form.state || !form.district) {
      setPinStatus({ state: "error", message: "Select state and district before PIN verification" });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setCheckingPin(true);
      setPinStatus({ state: "checking", message: "Verifying PIN code…" });
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${form.pincode}`, { signal: controller.signal });
        const json = await res.json();
        const result  = json?.[0];
        const offices = result?.PostOffice || [];
        if (result?.Status !== "Success" || offices.length === 0) {
          setPinStatus({ state: "error", message: "PIN code not found" });
          return;
        }
        const matches = offices.some((o) =>
          normalize(o.State) === normalize(form.state) &&
          normalize(o.District) === normalize(form.district)
        );
        setPinStatus(
          matches
            ? { state: "verified", message: "PIN code verified ✓" }
            : { state: "error", message: "PIN code does not match selected state/district" }
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setPinStatus({ state: "verified", message: "PIN format accepted. Live verification unavailable." });
        }
      } finally {
        setCheckingPin(false);
      }
    }, 500);

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [form.country, form.district, form.pincode, form.state]);

  // ── Validation ─────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const emailOk = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    const required = [
      form.fullName, form.mobile, form.email, form.country,
      form.state, form.district, form.city, form.pincode,
      form.houseNo, form.street, form.addressType, form.deliveryTime,
    ].every((v) => String(v || "").trim());

    if (!required) return { valid: false, message: "Complete all required address fields" };
    if (!/^\d{10}$/.test(form.mobile)) return { valid: false, message: "Mobile must be 10 digits" };
    if (form.alternateMobile && !/^\d{10}$/.test(form.alternateMobile))
      return { valid: false, message: "Alternate mobile must be 10 digits" };
    if (!emailOk) return { valid: false, message: "Enter a valid email address" };
    if (form.country === "India" && !/^\d{6}$/.test(form.pincode))
      return { valid: false, message: "PIN code must be exactly 6 digits" };
    if (form.country === "India" && pinStatus.state !== "verified")
      return { valid: false, message: pinStatus.message || "Verify PIN code" };
    if (form.deliveryTime === "Custom" && !form.customDeliveryTime.trim())
      return { valid: false, message: "Enter a custom delivery time" };
    return { valid: true, message: "Address ready ✓" };
  }, [form, pinStatus]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["mobile", "alternateMobile", "pincode"];
    const nextValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;
    setForm((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (name === "country") { next.state = ""; next.district = ""; next.pincode = ""; }
      if (name === "state")   { next.district = ""; next.pincode = ""; }
      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setPinStatus({ state: "idle", message: "" });
    setLocationStatus("");
    setShowForm(addresses.length === 0);
  };

  const saveCurrentLocation = () => {
    if (!navigator.geolocation) {
      const msg = "Location permission denied. Continue with manual address.";
      setLocationStatus(msg);
      notify(msg, "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }));
        setLocationStatus("Location captured successfully ✓");
        notify("Location added", "success");
        setLocating(false);
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? "Location permission denied. Continue with manual address."
          : "Could not get location. Continue with manual address.";
        setLocationStatus(msg);
        notify(msg, err.code === err.PERMISSION_DENIED ? "error" : "info");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const saveAddress = async () => {
    if (!validation.valid) { notify(validation.message, "error"); return; }
    if (!userId) { notify("You must be logged in", "error"); return; }
    setSaving(true);

    try {
      const payload = formToDb(form, userId);

      let savedRow;
      if (editingId) {
        const { data, error } = await supabase
          .from("addresses")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
          .select("*")
          .single();
        if (error) throw error;
        savedRow = data;
      } else {
        const { data, error } = await supabase
          .from("addresses")
          .insert([payload])
          .select("*")
          .single();
        if (error) throw error;
        savedRow = data;
      }

      notify(editingId ? "Address updated" : "Address saved", "success");
      await loadAddresses(userId);

      // Select the saved address
      const checkout = toCheckoutAddress(savedRow);
      setSelectedId(savedRow.id);
      setAddress?.(checkout);
      localStorage.setItem("selectedAddress", JSON.stringify(checkout));

      resetForm();
    } catch (err) {
      console.error("Save address error:", err);
      notify(err.message || "Could not save address", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectAddress = (addr) => {
    setSelectedId(addr.id);
    const checkout = toCheckoutAddress(addr);
    setAddress?.(checkout);
    localStorage.setItem("selectedAddress", JSON.stringify(checkout));
    notify("Delivery address selected", "success");
  };

  const editAddress = (addr) => {
    setForm({ ...EMPTY_FORM, ...dbToForm(addr) });
    setEditingId(addr.id);
    setShowForm(true);
    setPinStatus({ state: "idle", message: "" });
    window.requestAnimationFrame(() =>
      document.querySelector(".address-form-card")?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const deleteAddress = async () => {
    if (!deleteTarget || !userId) return;
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("user_id", userId);

    if (error) { notify("Could not delete address", "error"); return; }

    setDeleteTarget(null);
    notify("Address deleted", "success");
    await loadAddresses(userId);

    if (selectedId === deleteTarget.id) {
      setSelectedId(null);
      setAddress?.(null);
      localStorage.removeItem("selectedAddress");
    }
  };

  const continueToPayment = () => {
    const selected = addresses.find((a) => a.id === selectedId);
    if (!selected) { notify("Select or save a valid address first", "error"); return; }
    const checkout = toCheckoutAddress(selected);
    setAddress?.(checkout);
    localStorage.setItem("selectedAddress", JSON.stringify(checkout));
    setPage?.("payment");
  };

  const hasSavedAddresses = addresses.length > 0;
  const selectedAddress = addresses.find((a) => a.id === selectedId) || null;
  const selectedCheckout = selectedAddress ? toCheckoutAddress(selectedAddress) : null;

  if (loadingAddresses) {
    return (
      <div className="address-page">
        <div className="address-shell">
          <div className="home-loading" style={{ padding: "40px 0" }}>
            <div className="home-skeleton-card" style={{ height: 120, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`address-page ${hasSavedAddresses ? "address-page-select" : "address-page-add"}`}>
      <div className="address-shell">
        <header className="address-heading">
          <div>
            <p className="address-eyebrow">Checkout Address</p>
            <h2>{hasSavedAddresses ? "Select delivery address" : "Add delivery address"}</h2>
            <p className="address-subtitle">
              {hasSavedAddresses
                ? "Choose one of your saved addresses to continue checkout."
                : "Add a verified delivery address for fresh NutriBlend orders."}
            </p>
          </div>

          {hasSavedAddresses && !showForm && (
            <button type="button" className="address-add-top-btn" onClick={() => setShowForm(true)}>
              + Add New
            </button>
          )}
        </header>

        {selectedCheckout && (
          <section className="selected-address-panel">
            <div>
              <p className="selected-label">Selected for delivery</p>
              <h3>{selectedCheckout.name} <small>{selectedCheckout.type}</small></h3>
              <p>{selectedCheckout.street}, {selectedCheckout.city}, {selectedCheckout.district}, {selectedCheckout.state} – {selectedCheckout.pincode}</p>
              <p>{selectedCheckout.phone}{selectedCheckout.email ? ` | ${selectedCheckout.email}` : ""}</p>
            </div>
            <button type="button" onClick={continueToPayment}>Continue to Payment</button>
          </section>
        )}

        {showForm && (
          <section className="address-form-card">
            <div className="address-card-head">
              <div>
                <h3>{editingId ? "Edit Address" : "Add Address"}</h3>
                <span>{validation.message}</span>
              </div>
              {addresses.length > 0 && (
                <button type="button" className="address-close-form-btn" onClick={resetForm}>Close</button>
              )}
            </div>

            <div className="address-section-title">Contact Details</div>
            <div className="address-form-grid">
              <label>Full Name<input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Receiver full name" /></label>
              <label>Mobile Number<input name="mobile" value={form.mobile} onChange={handleChange} maxLength="10" inputMode="numeric" placeholder="10-digit mobile" /></label>
              <label>Alternate Mobile <span>Optional</span><input name="alternateMobile" value={form.alternateMobile} onChange={handleChange} maxLength="10" inputMode="numeric" placeholder="Alternate contact" /></label>
              <label>Email Address<input name="email" value={form.email} onChange={handleChange} type="email" placeholder="email@example.com" /></label>
            </div>

            <div className="address-section-title">Location Details</div>
            <div className="address-form-grid">
              <label>Country<select name="country" value={form.country} onChange={handleChange}>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
              {form.country === "India" ? (
                <>
                  <label>State / Union Territory<select name="state" value={form.state} onChange={handleChange}><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label>District<select name="district" value={form.district} onChange={handleChange} disabled={!form.state}><option value="">Select district</option>{districts.map((d) => <option key={d}>{d}</option>)}</select></label>
                </>
              ) : (
                <>
                  <label>State / Region<input name="state" value={form.state} onChange={handleChange} placeholder="State or region" /></label>
                  <label>District<input name="district" value={form.district} onChange={handleChange} placeholder="District" /></label>
                </>
              )}
              <label>City / Town<input name="city" value={form.city} onChange={handleChange} placeholder="City or town" /></label>
              <label>Postal / PIN Code<input name="pincode" value={form.pincode} onChange={handleChange} maxLength={form.country === "India" ? "6" : "12"} inputMode="numeric" placeholder="PIN code" /></label>
            </div>

            <div className={`pin-status ${pinStatus.state}`}>
              {checkingPin ? "Verifying PIN code…" : pinStatus.message || "PIN verification runs automatically"}
            </div>

            <div className="address-location-box">
              <div>
                <p>GPS Coordinates</p>
                <span>
                  {form.lat != null && form.lng != null
                    ? `${Number(form.lat).toFixed(6)}, ${Number(form.lng).toFixed(6)}`
                    : "Optional — improves live tracking"}
                </span>
              </div>
              <button type="button" className="address-location-btn" onClick={saveCurrentLocation} disabled={locating}>
                {locating ? "Getting Location…" : "Use Current Location"}
              </button>
            </div>
            {locationStatus && <div className="address-location-status">{locationStatus}</div>}

            <div className="address-section-title">Full Address</div>
            <div className="address-form-grid">
              <label>House No / Flat / Room<input name="houseNo" value={form.houseNo} onChange={handleChange} placeholder="Flat 203 / Room 12" /></label>
              <label>Building / Hostel / Gym<input name="building" value={form.building} onChange={handleChange} placeholder="Building, hostel, gym" /></label>
              <label className="address-form-wide">Street / Area / Locality<input name="street" value={form.street} onChange={handleChange} placeholder="Street, area, locality" /></label>
              <label>Landmark<input name="landmark" value={form.landmark} onChange={handleChange} placeholder="Near college, gym, metro…" /></label>
            </div>

            <div className="address-section-title">Delivery Preference</div>
            <div className="address-toggle-grid">
              {ADDRESS_TYPES.map((type) => (
                <button type="button" key={type} className={form.addressType === type ? "active" : ""} onClick={() => setForm((p) => ({ ...p, addressType: type }))}>{type}</button>
              ))}
            </div>
            <div className="address-toggle-grid delivery-time-grid">
              {DELIVERY_TIMES.map((time) => (
                <button type="button" key={time} className={form.deliveryTime === time ? "active" : ""} onClick={() => setForm((p) => ({ ...p, deliveryTime: time }))}>{time}</button>
              ))}
            </div>
            {form.deliveryTime === "Custom" && (
              <div className="address-form-grid">
                <label>Custom Delivery Time<input name="customDeliveryTime" value={form.customDeliveryTime} onChange={handleChange} placeholder="Example: After 7 PM" /></label>
              </div>
            )}

            <label className="address-note-label">Order Note <span>Optional</span><textarea name="orderNote" value={form.orderNote} onChange={handleChange} placeholder="Any delivery instruction" /></label>

            <div className="address-form-actions">
              <button type="button" className="address-primary-btn" onClick={saveAddress} disabled={!validation.valid || checkingPin || saving}>
                {saving ? "Saving…" : editingId ? "Update Address" : "Save Address"}
              </button>
              <button type="button" className="address-secondary-btn" onClick={resetForm}>Cancel</button>
            </div>
          </section>
        )}

        {hasSavedAddresses && (
          <section className="address-book-section">
            <div className="address-book-head">
              <div>
                <h3>Saved Addresses</h3>
                <p>Select an address for this order</p>
              </div>
            </div>

            <div className="address-list">
              {addresses.map((addr) => {
                const isSelected = selectedId === addr.id;
                const displayName  = addr.full_name || addr.name || "—";
                const displayPhone = addr.phone || "—";
                const displayAlt   = addr.alternate_phone || "";
                const displayStreet = buildStreet({
                  houseNo: addr.address_line_1, building: addr.address_line_2, street: addr.street,
                });
                const addrType = addr.address_type || addr.type || "Home";

                return (
                  <article key={addr.id} className={`address-item ${isSelected ? "is-selected" : ""}`} onClick={() => selectAddress(addr)}>
                    <div className="address-item-top">
                      <div>
                        <p className="address-name"><b>{displayName}</b></p>
                        <p className="address-phone">{displayPhone}{displayAlt ? ` | Alt ${displayAlt}` : ""}</p>
                      </div>
                      <div className="address-chip-group">
                        <span className="address-type-chip">{addrType}</span>
                        {isSelected && <span className="address-chip selected">Selected</span>}
                        {addr.is_default && <span className="address-chip">Default</span>}
                      </div>
                    </div>

                    <p className="address-text">
                      {displayStreet}{addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city}, {addr.district}, {addr.state} – {addr.postal_code || addr.pincode}
                    </p>
                    <p className="address-text">
                      {addr.delivery_time === "Custom" ? addr.custom_delivery_time : addr.delivery_time} delivery
                      {addr.order_note ? ` | ${addr.order_note}` : ""}
                    </p>

                    <div className="address-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => selectAddress(addr)}>{isSelected ? "Selected ✓" : "Deliver Here"}</button>
                      <button type="button" onClick={() => editAddress(addr)}>Edit</button>
                      <button type="button" onClick={() => setDeleteTarget(addr)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {hasSavedAddresses && (
          <div className="address-bottom-bar">
            <div>
              <span>Checkout address</span>
              <strong>
                {selectedCheckout
                  ? `${selectedCheckout.name} — ${selectedCheckout.pincode}`
                  : "Select a valid address"}
              </strong>
            </div>
            <button type="button" className="address-primary-btn address-continue-btn" onClick={continueToPayment} disabled={!selectedCheckout}>
              Continue to Payment
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Address?"
        message="This address will be permanently removed from your account."
        confirmText="Delete"
        cancelText="Keep"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteAddress}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { countries } from "../data/countries";
import { indiaStatesDistricts } from "../data/indiaStatesDistricts";
import { useNotification } from "../context/NotificationContext";
import "../styles/address.css";

const DELIVERY_TIMES = ["Morning", "Afternoon", "Evening", "Custom"];
const ADDRESS_TYPES = ["Home", "Hostel", "Gym", "Office", "Other"];

const EMPTY_FORM = {
  id: "",
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
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const buildLegacyStreet = (address) =>
  [address.houseNo, address.building, address.street].filter(Boolean).join(", ");

const toCheckoutAddress = (address) => ({
  ...address,
  name: address.fullName,
  phone: address.mobile,
  type: address.addressType,
  street: buildLegacyStreet(address),
  pincode: address.pincode,
});

const makeAddressId = () => `addr-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function Addresses({ setPage, setAddress }) {
  const { notify } = useNotification();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [pinStatus, setPinStatus] = useState({ state: "idle", message: "" });
  const [checkingPin, setCheckingPin] = useState(false);

  const states = useMemo(() => Object.keys(indiaStatesDistricts), []);
  const districts = form.country === "India" && form.state ? indiaStatesDistricts[form.state] || [] : [];

  useEffect(() => {
    const saved = readJson("savedAddresses", []);
    const selected = readJson("selectedAddress", null);
    const selectedFromSaved = saved.find(
      (address) => String(address.id) === String(selected?.id)
    );

    setAddresses(saved);
    setSelectedAddress(selectedFromSaved ? toCheckoutAddress(selectedFromSaved) : null);
    setAddress?.(selectedFromSaved ? toCheckoutAddress(selectedFromSaved) : null);
    setShowForm(saved.length === 0);
  }, [setAddress]);

  useEffect(() => {
    if (form.country !== "India") {
      setPinStatus({ state: "verified", message: "International address selected" });
      return;
    }

    if (form.pincode.length !== 6) {
      setPinStatus({ state: "idle", message: "Enter a 6 digit PIN code" });
      return;
    }

    if (!form.state || !form.district) {
      setPinStatus({ state: "error", message: "Select state and district before PIN verification" });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setCheckingPin(true);
      setPinStatus({ state: "checking", message: "Verifying PIN code..." });

      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${form.pincode}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        const result = data?.[0];
        const offices = result?.PostOffice || [];

        if (result?.Status !== "Success" || offices.length === 0) {
          setPinStatus({ state: "error", message: "PIN code not found" });
          return;
        }

        const matches = offices.some((office) => {
          const apiState = normalize(office.State);
          const apiDistrict = normalize(office.District);
          return apiState === normalize(form.state) && apiDistrict === normalize(form.district);
        });

        setPinStatus(
          matches
            ? { state: "verified", message: "PIN code verified" }
            : {
                state: "error",
                message: "PIN code does not match selected state/district",
              }
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setPinStatus({ state: "error", message: "Could not verify PIN code. Try again." });
        }
      } finally {
        setCheckingPin(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.country, form.district, form.pincode, form.state]);

  const validation = useMemo(() => {
    const emailOk = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    const required = [
      form.fullName,
      form.mobile,
      form.email,
      form.country,
      form.state,
      form.district,
      form.city,
      form.pincode,
      form.houseNo,
      form.street,
      form.addressType,
      form.deliveryTime,
    ].every((value) => String(value || "").trim());

    if (!required) return { valid: false, message: "Complete all required address fields" };
    if (!/^\d{10}$/.test(form.mobile)) return { valid: false, message: "Mobile number must be 10 digits" };
    if (form.alternateMobile && !/^\d{10}$/.test(form.alternateMobile)) {
      return { valid: false, message: "Alternate mobile number must be 10 digits" };
    }
    if (!emailOk) return { valid: false, message: "Enter a valid email address" };
    if (form.country === "India" && !/^\d{6}$/.test(form.pincode)) {
      return { valid: false, message: "PIN code must be exactly 6 digits" };
    }
    if (form.country === "India" && pinStatus.state !== "verified") {
      return { valid: false, message: pinStatus.message || "Verify PIN code" };
    }
    if (form.deliveryTime === "Custom" && !form.customDeliveryTime.trim()) {
      return { valid: false, message: "Enter a custom delivery time" };
    }

    return { valid: true, message: "Address ready" };
  }, [form, pinStatus]);

  const saveAddresses = (nextAddresses, nextSelected) => {
    setAddresses(nextAddresses);
    localStorage.setItem("savedAddresses", JSON.stringify(nextAddresses));

    if (nextSelected) {
      const checkoutAddress = toCheckoutAddress(nextSelected);
      setSelectedAddress(checkoutAddress);
      setAddress?.(checkoutAddress);
      localStorage.setItem("selectedAddressId", checkoutAddress.id);
      localStorage.setItem("selectedAddress", JSON.stringify(checkoutAddress));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ["mobile", "alternateMobile", "pincode"];
    const nextValue = numericFields.includes(name) ? value.replace(/\D/g, "") : value;

    setForm((prev) => {
      const next = { ...prev, [name]: nextValue };

      if (name === "country") {
        next.state = "";
        next.district = "";
        next.pincode = "";
      }

      if (name === "state") {
        next.district = "";
        next.pincode = "";
      }

      return next;
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setPinStatus({ state: "idle", message: "" });
    setShowForm(addresses.length === 0);
  };

  const saveAddress = () => {
    if (!validation.valid) {
      notify(validation.message, "error");
      return;
    }

    const address = {
      ...form,
      id: editingId || makeAddressId(),
      updatedAt: new Date().toISOString(),
    };

    const nextAddresses = editingId
      ? addresses.map((item) => (item.id === editingId ? address : item))
      : [address, ...addresses];

    saveAddresses(nextAddresses, address);
    notify(editingId ? "Address updated" : "Address saved", "success");
    resetForm();
  };

  const selectAddress = (address) => {
    const checkoutAddress = toCheckoutAddress(address);
    setSelectedAddress(checkoutAddress);
    setAddress?.(checkoutAddress);
    localStorage.setItem("selectedAddressId", checkoutAddress.id);
    localStorage.setItem("selectedAddress", JSON.stringify(checkoutAddress));
    notify("Delivery address selected", "success");
  };

  const editAddress = (address) => {
    setForm({ ...EMPTY_FORM, ...address });
    setEditingId(address.id);
    setShowForm(true);
    setPinStatus({ state: "idle", message: "" });
    window.requestAnimationFrame(() => {
      document.querySelector(".address-form-card")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const deleteAddress = () => {
    if (!deleteTarget) return;

    const nextAddresses = addresses.filter((address) => address.id !== deleteTarget.id);
    const wasSelected = selectedAddress?.id === deleteTarget.id;
    const nextSelected = wasSelected ? nextAddresses[0] || null : selectedAddress;

    setAddresses(nextAddresses);
    localStorage.setItem("savedAddresses", JSON.stringify(nextAddresses));

    if (nextSelected) {
      const checkoutAddress = toCheckoutAddress(nextSelected);
      setSelectedAddress(checkoutAddress);
      setAddress?.(checkoutAddress);
      localStorage.setItem("selectedAddressId", checkoutAddress.id);
      localStorage.setItem("selectedAddress", JSON.stringify(checkoutAddress));
    } else {
      setSelectedAddress(null);
      setAddress?.(null);
      localStorage.removeItem("selectedAddressId");
      localStorage.removeItem("selectedAddress");
    }

    setDeleteTarget(null);
    notify("Address deleted", "success");
  };

  const continueToPayment = () => {
    if (!selectedAddress) {
      notify("Select or save a valid address first", "error");
      return;
    }

    setAddress?.(selectedAddress);
    localStorage.setItem("selectedAddressId", selectedAddress.id);
    localStorage.setItem("selectedAddress", JSON.stringify(selectedAddress));
    setPage?.("payment");
  };

  return (
    <div className="address-page">
      <div className="address-shell">
        <header className="address-heading">
          <div>
            <p className="address-eyebrow">Checkout Address</p>
            <h2>Delivery details</h2>
            <p className="address-subtitle">
              Add a verified delivery address for fresh NutriBlend orders. Your saved addresses stay on this device for fast checkout.
            </p>
          </div>

          <button type="button" className="address-add-top-btn" onClick={() => setShowForm(true)}>
            Add New Address
          </button>
        </header>

        {selectedAddress && (
          <section className="selected-address-panel">
            <div>
              <p className="selected-label">Selected for delivery</p>
              <h3>{selectedAddress.name} <small>{selectedAddress.type}</small></h3>
              <p>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.district}, {selectedAddress.state} - {selectedAddress.pincode}</p>
              <p>{selectedAddress.phone} {selectedAddress.email ? ` | ${selectedAddress.email}` : ""}</p>
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
              <label>Mobile Number<input name="mobile" value={form.mobile} onChange={handleChange} maxLength="10" inputMode="numeric" placeholder="10 digit mobile number" /></label>
              <label>Alternate Mobile Number <span>Optional</span><input name="alternateMobile" value={form.alternateMobile} onChange={handleChange} maxLength="10" inputMode="numeric" placeholder="Alternate contact" /></label>
              <label>Email Address<input name="email" value={form.email} onChange={handleChange} type="email" placeholder="email@example.com" /></label>
            </div>

            <div className="address-section-title">Location Details</div>
            <div className="address-form-grid">
              <label>Country<select name="country" value={form.country} onChange={handleChange}>{countries.map((country) => <option key={country}>{country}</option>)}</select></label>
              {form.country === "India" ? (
                <>
                  <label>State / Union Territory<select name="state" value={form.state} onChange={handleChange}><option value="">Select state</option>{states.map((state) => <option key={state}>{state}</option>)}</select></label>
                  <label>District<select name="district" value={form.district} onChange={handleChange} disabled={!form.state}><option value="">Select district</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></label>
                </>
              ) : (
                <>
                  <label>State / Region<input name="state" value={form.state} onChange={handleChange} placeholder="State or region" /></label>
                  <label>District<input name="district" value={form.district} onChange={handleChange} placeholder="District" /></label>
                </>
              )}
              <label>City / Town<input name="city" value={form.city} onChange={handleChange} placeholder="City or town" /></label>
              <label>Postal Code / PIN Code<input name="pincode" value={form.pincode} onChange={handleChange} maxLength={form.country === "India" ? "6" : "12"} inputMode="numeric" placeholder="PIN code" /></label>
            </div>

            <div className={`pin-status ${pinStatus.state}`}>{checkingPin ? "Verifying PIN code..." : pinStatus.message || "PIN verification will run automatically"}</div>

            <div className="address-section-title">Full Address</div>
            <div className="address-form-grid">
              <label>House No / Flat No / Room No<input name="houseNo" value={form.houseNo} onChange={handleChange} placeholder="Flat 203 / Room 12" /></label>
              <label>Building / Hostel / Gym Name<input name="building" value={form.building} onChange={handleChange} placeholder="Building, hostel, gym" /></label>
              <label className="address-form-wide">Street / Area / Locality<input name="street" value={form.street} onChange={handleChange} placeholder="Street, area, locality" /></label>
              <label>Landmark<input name="landmark" value={form.landmark} onChange={handleChange} placeholder="Near college, gym, metro..." /></label>
            </div>

            <div className="address-section-title">Delivery Preference</div>
            <div className="address-toggle-grid">
              {ADDRESS_TYPES.map((type) => (
                <button type="button" key={type} className={form.addressType === type ? "active" : ""} onClick={() => setForm((prev) => ({ ...prev, addressType: type }))}>{type}</button>
              ))}
            </div>

            <div className="address-toggle-grid delivery-time-grid">
              {DELIVERY_TIMES.map((time) => (
                <button type="button" key={time} className={form.deliveryTime === time ? "active" : ""} onClick={() => setForm((prev) => ({ ...prev, deliveryTime: time }))}>{time}</button>
              ))}
            </div>

            {form.deliveryTime === "Custom" && (
              <div className="address-form-grid">
                <label>Custom Delivery Time<input name="customDeliveryTime" value={form.customDeliveryTime} onChange={handleChange} placeholder="Example: After 7 PM" /></label>
              </div>
            )}

            <label className="address-note-label">Order Note <span>Optional</span><textarea name="orderNote" value={form.orderNote} onChange={handleChange} placeholder="Any delivery instruction for this order" /></label>

            <div className="address-form-actions">
              <button type="button" className="address-primary-btn" onClick={saveAddress} disabled={!validation.valid || checkingPin}>
                {editingId ? "Update Address" : "Save Address"}
              </button>
              <button type="button" className="address-secondary-btn" onClick={resetForm}>Cancel</button>
            </div>
          </section>
        )}

        <section className="address-book-section">
          <div className="address-book-head">
            <div>
              <h3>Saved Addresses</h3>
              <p>{addresses.length} address{addresses.length === 1 ? "" : "es"} saved</p>
            </div>
          </div>

          {addresses.length === 0 ? (
            <div className="address-empty-state">
              <h3>No saved address yet</h3>
              <p>Add a verified address to continue checkout.</p>
            </div>
          ) : (
            <div className="address-list">
              {addresses.map((address) => {
                const isSelected = selectedAddress?.id === address.id;

                return (
                  <article key={address.id} className={`address-item ${isSelected ? "is-selected" : ""}`} onClick={() => selectAddress(address)}>
                    <div className="address-item-top">
                      <div>
                        <p className="address-name"><b>{address.fullName}</b></p>
                        <p className="address-phone">{address.mobile} {address.alternateMobile ? ` | Alt ${address.alternateMobile}` : ""}</p>
                      </div>
                      <div className="address-chip-group">
                        <span className="address-type-chip">{address.addressType}</span>
                        {isSelected && <span className="address-chip selected">Selected</span>}
                      </div>
                    </div>

                    <p className="address-text">
                      {buildLegacyStreet(address)}, {address.landmark ? `${address.landmark}, ` : ""}{address.city}, {address.district}, {address.state} - {address.pincode}
                    </p>
                    <p className="address-text">{address.deliveryTime === "Custom" ? address.customDeliveryTime : address.deliveryTime} delivery {address.orderNote ? ` | ${address.orderNote}` : ""}</p>

                    <div className="address-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => selectAddress(address)}>{isSelected ? "Selected" : "Deliver Here"}</button>
                      <button type="button" onClick={() => editAddress(address)}>Edit</button>
                      <button type="button" onClick={() => setDeleteTarget(address)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="address-bottom-bar">
          <div>
            <span>Checkout address</span>
            <strong>{selectedAddress ? `${selectedAddress.name} - ${selectedAddress.pincode}` : "Save or select a valid address"}</strong>
          </div>
          <button type="button" className="address-primary-btn address-continue-btn" onClick={continueToPayment} disabled={!selectedAddress}>
            Continue to Payment
          </button>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Address?"
        message="This saved address will be removed from this device."
        confirmText="Delete"
        cancelText="Keep"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteAddress}
      />
    </div>
  );
}

